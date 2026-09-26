# Android Coil Compose Patterns

## Selection Notes
- Category: `ui`
- Best fit when the request is specifically about Compose image loading, placeholders, painter choice, and image-list performance.
- Reach for neighboring Compose skills when the image work is incidental to broader layout or state architecture changes.

## API Choice Guide
- Most image surfaces:
  Prefer: `AsyncImage`
- Need a `Painter` or direct access to load state:
  Prefer: `rememberAsyncImagePainter`, but pair it with an explicit size strategy when needed
- Need custom loading or error content slots:
  Prefer: `SubcomposeAsyncImage` only when the slot behavior is worth the extra overhead

## Default Review Sequence
1. Choose `AsyncImage`, painter API, or slot API based on the component need.
2. Constrain size and fallback states.
3. Validate content description behavior.
4. Review list performance and screenshot stability.
5. Hand off broader Compose work if needed.

## Best-Practice Notes
- Remote URLs in Coil 3 often require an explicit network module dependency.
- `rememberAsyncImagePainter` is useful, but it can over-fetch if request size is left unconstrained.
- Decorative images should usually use `contentDescription = null`.
- Lists should favor simple image surfaces and stable item keys.

## Handoff Shortlist
- `android-compose-foundations`
- `android-compose-performance`
