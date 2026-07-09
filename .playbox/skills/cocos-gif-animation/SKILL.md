---
name: cocos-gif-animation
description: Convert GIFs or rendered frame assets into optimized Cocos Creator sprite-frame animations, wire them into scenes/runtime, and remove legacy tween or sequence logic safely.
---

# Cocos GIF / asset animation workflow

Use this skill when a project has:
- a GIF that should become a Cocos runtime animation
- a folder of rendered frames that should become an `AnimationClip`
- legacy sprite-sequence / tween animation that should be replaced with editor-driven `Animation`
- staged reveal/payoff transitions built from static art states

## Core rule

For Cocos playable/web projects, **do not ship GIFs directly as runtime animation** unless there is a very specific reason.

Preferred order:
1. `GIF -> extracted frames -> sampled frames -> Cocos SpriteFrame animation`
2. static sprite + light tween polish
3. direct GIF runtime only as throwaway prototype

Reasons:
- better runtime control
- cleaner `Animation.play()` integration
- easier pause/resume/state sync
- easier atlas packing
- better control over bundle size and memory
- avoids GIF import / alpha / playback issues

## Recommended production pattern

### 1. Extract the source first

If the source is a GIF, inspect it before touching the scene.

Use terminal tooling such as:
- `ffprobe` for width/height/frame count/fps/duration
- `ffmpeg` for extraction

Typical extraction:

```bash
ffmpeg -y -i "source.gif" -vsync 0 "frames/source_%03d.png"
```

Also generate a contact sheet for review when useful:

```bash
ffmpeg -y -i "source.gif" -vf "fps=1,tile=6x6:padding=4:margin=4:color=0x00000000" "previews/source-contact.png"
```

## 2. Do not keep full GIF density by default

Raw extraction often creates too many frames and too much weight.

Preferred workflow:
- inspect total frames
- create a sampled set for runtime
- keep the full extraction only as source/reference

Good defaults:
- fire / ambient loops: `8-18` frames
- character happy / idle loops: `10-16` frames
- reveal / payoff loops: choose the minimum that preserves silhouette readability

## 3. Use a clean folder structure

Recommended reusable structure:

```text
assets/art/<category>/<loop-name>/source/           # optional original gif / renders
assets/art/<category>/<loop-name>/frames-full/      # full extracted frames
assets/art/<category>/<loop-name>/frames/           # sampled production frames
assets/art/<category>/<loop-name>/previews/         # contact sheets / review images
assets/animations/<feature>/<clip-name>.anim        # final clip if stored separately
```

If the editor-created `.anim` lives beside the frames, that is acceptable, but keep naming explicit.

Example naming:
- `fire-loop_001.png ... fire-loop_018.png`
- `happy-toto-loop_001.png ... happy-toto-loop_012.png`

## 4. Cocos import strategy

In Cocos, the normal path is:
1. import sampled frames
2. create `Auto Atlas` or `SpriteAtlas` for the `frames/` folder
3. create an `AnimationClip`
4. animate `cc.Sprite.spriteFrame`
5. attach `Animation` component to the target scene node

Important:
- the clip keys should reference **SpriteFrame assets from PNG frames**, not the atlas asset itself
- `Auto Atlas` is for packing/optimization, not the value you key directly on the timeline

## 5. Scene composition pattern

Prefer a dedicated animated child node instead of animating the gameplay container directly.

Recommended hierarchy:

```text
EffectRoot / CharacterRoot / VisualRoot
  AnimatedSprite
```

Why:
- scene artists can position the animated child precisely
- gameplay code can scale/fade/state-switch without overwriting scene placement
- easier replacement of legacy visuals

Typical components on the animated child:
- `UITransform`
- `Sprite`
- `Animation`
- optional `UIOpacity`

## 6. Clip setup rules

For loop clips:
- set correct `sample` / FPS
- set correct `_duration`
- set `wrapMode` to loop
- keep frame order strictly sequential

Useful defaults:
- fire loop: `8 fps`
- simple character loop: `10 fps`

If editing `.anim` manually or validating generated files, confirm:
- track type is `cc.animation.ObjectTrack`
- binding path targets `cc.Sprite -> spriteFrame`
- key times match the frame cadence
- `wrapMode` is loop

## 7. Runtime migration pattern

When replacing old logic, move from:
- `resources.loadDir()` frame sequences
- hand-rolled frame swapping
- endless tween bounce used as fake animation

to:
- explicit `Animation` component
- `Animation.play(defaultClip.name)`
- `getState(clipName)` if playback speed control is needed

Safer migration pattern:
1. create the new animated child node
2. wire the clip in the editor
3. update the runtime component to target the new child
4. only then remove the old sprite/sequence/tween logic

## 8. Preserve gameplay logic, remove visual legacy

When modernizing animation code, keep gameplay state but strip visual hacks that are no longer needed.

Usually safe to remove after migration:
- hardcoded `resources.loadDir()` frame paths
- ad hoc frame order arrays
- idle fake animation tweens replacing real clips
- runtime position / anchor manipulation that exists only to fake squash
- duplicated static placeholder sprites that now fight the animated child

Keep if still needed:
- level/state switching
- opacity transitions
- playback speed changes by state
- glow / VFX support nodes
- pause/resume hooks from the state machine

## 9. Bottom-anchored “extinguish / shrink” effects

When an effect should shrink **without floating upward**:
- anchor the animated visual node at the bottom (`anchorY = 0`)
- scale the animated child, not the gameplay container
- if the effect should also narrow, scale both `x` and `y`
- keep horizontal/vertical ratios deliberate per state

This is especially useful for:
- fire intensity reduction
- fountain / smoke reduction
- staged payoff reveals

## 10. Staged payoff / reveal transitions

For cinematic transitions built from static art states, prefer explicit stages over one big fade:

Example pattern:
1. hold the last gameplay state briefly
2. fade gameplay hazard / VFX
3. crossfade from closed state to open state
4. reveal the freed/full-body character
5. fade the threat composition out
6. only then show the final end-card

This is cleaner than:
- hiding everything in parallel
- jumping directly from gameplay to end-card

## 11. Common debugging checklist

If the animation does not look right, check these in order:

### Clip issues
- wrong `wrapMode` -> animation plays once instead of looping
- wrong `sample` or `_duration` -> timing feels off
- stale clip import -> reimport or recreate the clip in Cocos
- `playOnLoad` masking runtime problems -> prefer explicit `play()` from code

### Sprite sizing issues
- `Sprite` trimmed mode makes visuals look smaller than expected
- `Sprite` `sizeMode` may not match the intended `UITransform`
- actual raw image size may differ from editor container size
- child node offset may make the animation appear too low/high

### Runtime issues
- script still targets the parent/static sprite instead of the animated child
- `Animation.play()` return type may be `void`; use `play()` then `getState()` if needed
- duplicated static sprite causes ghosting beneath the new animation
- old tweens still run on the same node and fight the clip

## 12. Recommended agent workflow

When doing this work as an agent:

1. inspect source assets and measure them
2. extract full frames if needed
3. generate sampled production frames
4. create preview/contact sheets for review
5. keep source extraction and production frames separate
6. prepare Cocos-friendly naming and folder structure
7. add/wire scene nodes with `cocos_*` tools, never by raw file editing
8. migrate runtime from legacy visual code to `Animation`-first logic
9. remove old visual-only hacks after validation
10. validate scene/prefab after edits

## 13. Tooling guidance

### Use Cocos tools for scene/prefab work
Never edit `.scene` / `.prefab` directly.

Use:
- `cocos_query_scene_graph`
- `cocos_inspect_node`
- `cocos_apply_edits` with `dryRun: true` first
- `cocos_validate_document`

### Use shell for extraction / sampling
Good fit for:
- `ffprobe`
- `ffmpeg`
- small sampling scripts
- file weight checks

### Use normal file editing for TypeScript runtime code
Typical targets:
- view/controller classes
- animation wrappers
- state-machine transitions

## 14. Reusable decision rules

Choose **sampled SpriteFrame animation** when:
- the source already exists as a GIF/render
- timing matters
- the sequence must sync with gameplay states
- the project is a web playable and weight matters

Choose **static sprite + tween** when:
- the motion is simple
- bundle budget is extremely tight
- you only need subtle pulse/float/reveal

Choose **staged static-state transitions** when:
- the payoff is really several visual states
- separate art states exist (`closed`, `open`, `freed`, `final`)
- readability matters more than continuous motion

## 15. Output expectations for the agent

When finishing, report:
- source asset(s) used
- sampled frame count and FPS chosen
- final folder structure
- scene nodes added or rewired
- legacy logic removed
- any remaining editor-only steps
- exact QA checks for loop, sizing, positioning, and state transitions
