# Combat Module Decisions

## Trail implementation
Low-alpha black overlay each frame (not true history buffer). Each frame, `fillRect` with `rgba(10,10,15,0.18)` over the whole canvas. This creates a cheap motion blur effect without allocating a second buffer.

## Cluster boundary visualization
None. Only render dots (jittered offsets from cluster centroid) are drawn. No outlines, circles, or convex hull overlays.

## Tier C debug overlay
Not implemented in v1. The density grid is not visualized; only sampled dots drawn at random positions within each cell.

## K-means initialization
Spatial init: pick `k` units at evenly-spaced indices through the unit array (`idx = floor(ci * n / k)`). This is O(k) and avoids empty initial clusters better than pure random seeding.

## Render dot sub-tick interpolation
Not implemented. Dots move via random walk (jitter) each tick. No interpolation between ticks.

## Cross-tier combat (A vs B)
Handled via a dedicated `crossCombatAvsB` function in `engine.ts`, called each tick when one side is in tier A and the other in tier B. Per-tick mutual damage is computed directly; tier A units seek and attack cluster centroids, clusters deal proportional DPS back.

## Tier C randomness
Dots in tier C cells are placed at uniformly random positions within each cell every frame. The resulting shimmer/flicker is intentional and conveys the stochastic nature of the density field.
