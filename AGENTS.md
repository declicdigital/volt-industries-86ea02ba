<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep gameplay in the standalone iframe HTML and test its extracted logic with Node's test runner; this preserves the existing game structure without coupling tests to the React wrapper.
- Gem trial scaling must compensate retained player passive bonuses before applying progression; per-Gem career randomness remains independent of collection order.
