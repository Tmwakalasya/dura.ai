"""Event emission: the bridge from the local WAL to dura Cloud.

These tests run a real in-process HTTP server and assert on the actual
POSTed payloads — no mocks. The hard requirement under test everywhere:
emission is best-effort and can NEVER break or block a workflow.
"""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from dura import durable, SimulatedCrash


@pytest.fixture()
def receiver():
    """A live HTTP endpoint that records every event it receives."""
    received = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            received.append({"headers": dict(self.headers), "body": body})
            self.send_response(200)
            self.end_headers()

        def log_message(self, *args):  # keep pytest output clean
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}/ingest", received
    server.shutdown()


def _bodies(received):
    """Event bodies in emission order (seq is per-run, so sort within arrival)."""
    return sorted((r["body"] for r in received), key=lambda b: b["seq"])


def test_a_run_emits_lifecycle_and_step_events(receiver, tmp_path):
    url, received = receiver

    @durable
    def flow(ctx):
        ctx.step("a", lambda: {"x": 1})
        ctx.step("b", lambda: 2)
        return "done"

    assert flow(log=str(tmp_path / "r.db"), emit=url) == "done"

    bodies = _bodies(received)
    shape = [(b["type"], b["event"]) for b in bodies]
    assert shape == [
        ("run", "started"),
        ("step", "executed"),
        ("step", "executed"),
        ("run", "completed"),
    ]

    # Every event carries the envelope the ingest needs.
    for b in bodies:
        assert b["fn"] == "flow"
        assert b["run_id"] == bodies[0]["run_id"]
        assert b["worker_id"]
        assert b["log"].endswith("r.db")
        assert isinstance(b["ts"], float)

    # Executed step events carry result + duration.
    executed = [b for b in bodies if b["event"] == "executed"]
    assert executed[0]["step"] == "a"
    assert executed[0]["result"] == {"x": 1}
    assert isinstance(executed[0]["duration_ms"], int)


def test_resume_emits_skipped_for_committed_steps(receiver, tmp_path):
    url, received = receiver
    log = str(tmp_path / "r.db")

    @durable
    def flow(ctx):
        ctx.step("charge", lambda: "ch")
        ctx.step("book", lambda: "fl")

    with pytest.raises(SimulatedCrash):
        flow(log=log, emit=url, crash_after="charge")

    # The simulated crash itself is visible in the stream.
    assert any(
        b["type"] == "run" and b["event"] == "crashed" for b in _bodies(received)
    )

    received.clear()
    flow(log=log, emit=url)

    bodies = _bodies(received)
    assert any(b["event"] == "skipped" and b.get("step") == "charge" for b in bodies)
    assert any(b["event"] == "executed" and b.get("step") == "book" for b in bodies)
    assert bodies[-1]["event"] == "completed"


def test_rollback_events_are_emitted(receiver, tmp_path):
    url, received = receiver

    @durable
    def flow(ctx):
        ctx.step("charge", lambda: "ch", undo=lambda: None)
        ctx.step("explode", lambda: 1 / 0)

    with pytest.raises(ZeroDivisionError):
        flow(log=str(tmp_path / "r.db"), emit=url)

    bodies = _bodies(received)
    shape = [(b["event"], b.get("step")) for b in bodies]
    assert ("failed", "explode") in shape
    assert ("rolled_back", "charge") in shape
    # The run-level failure closes the stream.
    assert bodies[-1]["type"] == "run" and bodies[-1]["event"] == "failed"


def test_a_dead_endpoint_never_breaks_the_workflow(tmp_path):
    calls = {"n": 0}

    def work():
        calls["n"] += 1
        return "ok"

    @durable
    def flow(ctx):
        return ctx.step("a", work)

    # Port 9 (discard) — nothing listens; connections are refused instantly.
    assert flow(log=str(tmp_path / "r.db"), emit="http://127.0.0.1:9/ingest") == "ok"
    assert calls["n"] == 1


def test_token_is_sent_as_bearer_auth(receiver, tmp_path, monkeypatch):
    url, received = receiver
    monkeypatch.setenv("DURA_EMIT_TOKEN", "sk_test_123")

    @durable
    def flow(ctx):
        return ctx.step("a", lambda: 1)

    flow(log=str(tmp_path / "r.db"), emit=url)

    assert received  # something arrived
    assert all(
        r["headers"].get("Authorization") == "Bearer sk_test_123" for r in received
    )


def test_emit_url_from_environment_needs_no_code_change(receiver, tmp_path, monkeypatch):
    url, received = receiver
    monkeypatch.setenv("DURA_EMIT_URL", url)

    @durable
    def flow(ctx):
        return ctx.step("a", lambda: 1)

    flow(log=str(tmp_path / "r.db"))  # no emit= anywhere in code

    assert any(b["event"] == "completed" for b in _bodies(received))


def test_no_emit_means_no_events_and_no_threads(tmp_path):
    before = threading.active_count()

    @durable
    def flow(ctx):
        return ctx.step("a", lambda: 1)

    assert flow(log=str(tmp_path / "r.db")) == 1
    assert threading.active_count() == before  # no emitter thread was spawned
