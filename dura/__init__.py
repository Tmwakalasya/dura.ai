"""dura — durable execution for AI agents.

Wrap any function in @durable. Each step's result is written to a
durable log before the workflow continues. If the process crashes,
re-running the workflow replays the log: completed steps return their
cached result instead of executing again (exactly-once).
"""

from dura.runtime import durable, Context, SimulatedCrash
from dura.log import WAL

__all__ = ["durable", "Context", "SimulatedCrash", "WAL"]
__version__ = "0.0.1"
