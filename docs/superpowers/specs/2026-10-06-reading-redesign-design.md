# Reading redesign (branch `redesign/reading`)

Agreed with the owner on 2026-10-06, from mockups. Built on a separate branch
served locally (`localhost:4322`); `main` and the live site are untouched until
the owner says to deploy.

## Decisions

| Area | Choice | Rejected |
|---|---|---|
| Welcome | Centred card over a dimmed page, every visit, closes on Start exploring, its ×, a click outside, or Escape | Full-width strip; card over the map only |
| Welcome tone | First person ("Hi, I'm Gautier."), facts from About me only | Third person |
| Help | Legend no longer opens by itself; its button pulses (2 s) until used or a project opens; scene shift when open cut to a third | Legend open on load |
| Mobile | Same welcome card replaces the 6 s auto-opening help card | Both |
| List cards | 4:3 thumbnail, title, one where line, classic-portfolio summary, link chips | Text only |
| Detail view | Fact sheet: summary as lead, then figure + facts + links beside left-aligned text | Single article column |
| Content | No blue bold; summaries copied verbatim from the classic portfolio; facts built only from existing fields | New wording |

## Not done (needs the owner's text review first)

Splitting each long project text into "What I did / Outcome" sections. That
rewords the owner's texts, so it is proposed separately, project by project.
