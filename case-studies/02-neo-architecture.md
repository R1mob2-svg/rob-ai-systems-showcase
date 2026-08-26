# Case Study: NEO / OpenClaw Operating Architecture

## Problem

Individual AI chats are useful, but they are a poor operating system for ongoing work. Context gets trapped in sessions, agents duplicate effort, completion claims conflict, and there is no durable control plane for commands, approvals, receipts, and handoffs.

NEO is an operating architecture designed to coordinate AI-assisted work across projects and business workflows.

## Architecture Goals

- Persistent project and operating context
- Clear agent roles and handoffs
- Command routing from human inputs into structured work
- GitHub-backed records for important tasks and changes
- Receipt/status tracking instead of conversational assumptions
- Human approval around sensitive actions
- Local and cloud worker coordination
- Fail-closed behaviour when evidence is missing

## Multi-Agent Structure

The system separates different jobs rather than asking one model to pretend it can safely do everything at once. Different lanes can cover architecture, implementation, review, operational execution, and business acceptance.

This allows a workflow to use specialist AI/coding systems while keeping one set of acceptance rules around the result.

## Memory and Continuity

A major design goal is preventing important operating knowledge from living only inside a chat transcript. Structured project state, operating rules, handoffs, receipts, and checkpoints are used to improve continuity between agents and sessions.

## Human Control

The architecture is intentionally not based on unlimited autonomous access. The founder remains the acceptance authority for production-sensitive changes, while agents can perform research, implementation, testing, documentation, and controlled execution within defined boundaries.

## Why It Matters

NEO represents the practical systems problem behind agentic AI: not simply getting a model to answer a question, but getting several tools and agents to perform useful ongoing work without losing accountability, state, or control.

Commercial implementation details and credentials-sensitive infrastructure remain private.