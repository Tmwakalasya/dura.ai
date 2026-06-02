"""Durable research agent — LangChain + dura.

A real production test: an agent searches the web for a topic, summarises
each source, then writes a final report to disk. Every tool call is wrapped
in a dura step so:

  - A crash mid-research never re-runs completed searches.
  - The final write fires exactly once even if the process dies between
    the last search and the write.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python examples/research_agent.py "durable execution for AI agents"

Crash test — interrupt with Ctrl+C or kill -9 mid-run, then rerun the
same command. Completed search steps are skipped; the agent picks up where
it died.
"""

from __future__ import annotations

import json
import os
import sys
import textwrap
from datetime import datetime
from pathlib import Path

from dura import durable
from langchain_anthropic import ChatAnthropic
from langchain_community.tools import DuckDuckGoSearchRun

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    print("error: set ANTHROPIC_API_KEY env var first")
    sys.exit(1)

llm = ChatAnthropic(
    model="claude-haiku-4-5-20251001",
    api_key=ANTHROPIC_API_KEY,
    max_tokens=1024,
)
search = DuckDuckGoSearchRun()


def web_search(query: str) -> str:
    return search.run(query)


def summarise(topic: str, raw: str) -> str:
    """Ask the LLM to distill raw search results into a tight paragraph."""
    prompt = (
        f"You are a research assistant. Given raw search results about '{topic}', "
        f"write a concise 2-3 sentence summary of the key facts.\n\n"
        f"Search results:\n{raw[:3000]}"
    )
    return llm.invoke(prompt).content


def write_report(topic: str, sections: list[dict]) -> Path:
    slug = topic.lower().replace(" ", "_")[:40]
    out = Path(f"report_{slug}.md")
    lines = [f"# Research report: {topic}",
             f"*Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} by dura research agent*\n"]
    for s in sections:
        lines.append(f"## {s['query']}\n")
        lines.append(s["summary"] + "\n")
    out.write_text("\n".join(lines))
    return out


@durable
def research_agent(ctx, topic: str, queries: list[str]):
    """
    A durable research workflow. Each search + summarise pair is a single
    committed step so a crash never repeats an API call.
    """
    print(f"\n🔍  researching: {topic}")
    print(f"    {len(queries)} queries planned\n")

    sections = []

    for i, query in enumerate(queries, 1):
        step_name = f"search_{i}"

        # This is the key: both the web search AND the LLM summarise call
        # happen inside one dura step. If we crash after committing this step,
        # neither the search nor the summarise fires again on resume.
        result = ctx.step(
            step_name,
            lambda q=query: {
                "query": q,
                "summary": summarise(q, web_search(q)),
            },
        )

        is_skipped = any(n == step_name and e == "skipped" for n, e in ctx.events)
        marker = "↺  skipped (from log)" if is_skipped else "✓  done"
        print(f"  [{i}/{len(queries)}] {query[:60]}")
        print(f"         {marker}")
        sections.append(result)

    # Final write — also exactly-once.
    report_path = ctx.step(
        "write_report",
        lambda: str(write_report(topic, sections)),
    )

    return report_path


if __name__ == "__main__":
    topic = " ".join(sys.argv[1:]) or "durable execution for AI agents"

    # Three focused sub-queries give the agent breadth without too many API calls.
    queries = [
        f"what is {topic}",
        f"{topic} use cases and examples",
        f"{topic} tools and frameworks 2024",
    ]

    # The log path is stable per-topic so resuming uses the same file.
    slug = topic.lower().replace(" ", "_")[:40]
    log = f"research_{slug}.db"

    print(f"  log: {log}  (delete to start fresh)")

    report = research_agent(topic, queries, log=log)

    print(f"\n📄  report written → {report}")
    print(f"    steps this run:")
    for name, event in research_agent.last_context.events:
        mark = "↺ skip" if event == "skipped" else "▸ exec"
        print(f"      {mark}  {name}")
