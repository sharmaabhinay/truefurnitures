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

- Keep the home splash in the shared root as a one-time document-entry overlay, released by page, font and eager-image readiness; this avoids delaying later navigation or lazy media.
- Product 3D viewers must use the product's supplied model and show an unavailable/error state instead of substituting generic geometry; this prevents a misleading product preview.
- Product photo galleries use the installed Embla carousel with shared selection for touch, keyboard and thumbnails; this keeps gesture handling consistent without a custom swipe engine.
- Customer preparation FAQs live in one shared data module, reused by home, product pages and the FAQ page; this prevents answers drifting between customer entry points.
- The home customer journey uses lazy-loaded illustrative photographs and one-shot IntersectionObserver reveals with reduced-motion support; this avoids delaying the splash or repeatedly animating content.
- Home and product sections render through the shared page-layout registry; keep their arrangements in a dedicated site-settings document so unrelated CMS saves cannot overwrite them. Editor previews use same-origin parent-frame messages and never persist before Save.
- Use dnd-kit sortable with pointer and keyboard sensors for page-section ordering; keep accessible move buttons as a non-drag alternative.
- Product analytics aggregation lives in a browser-safe pure module with UTC buckets and shared product identity matching; required data reads must surface failures rather than produce fabricated zero totals.
- Product analytics charts use the installed Recharts library and scoped semantic analytics tokens; this provides accessible interactive charts without a custom plotting engine.
