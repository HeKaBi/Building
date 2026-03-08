<template>
  <div class="architecture-sketch" :style="styleVars">
    <svg viewBox="0 0 360 240" role="img" aria-hidden="true">
      <rect x="0" y="0" width="360" height="240" class="paper"></rect>
      <path class="ground" d="M20 208 H340"></path>

      <g v-if="variant === 'residence-courtyard'">
        <path class="roof accent" d="M48 156 Q132 96 214 112 T314 92"></path>
        <path class="roof" d="M72 170 Q138 132 205 142 T278 132"></path>
        <path class="frame" d="M92 168 V208 M128 154 V208 M170 146 V208 M212 142 V208 M252 144 V208"></path>
        <path class="frame light" d="M82 182 H264 M78 194 H266"></path>
        <path class="accent-line" d="M74 176 H262"></path>
        <path class="shadow-fill" d="M90 182 H258 V200 H90 Z"></path>
      </g>

      <g v-else-if="variant === 'residence-tulou'">
        <ellipse cx="182" cy="160" rx="116" ry="44" class="outline-fill"></ellipse>
        <ellipse cx="182" cy="160" rx="78" ry="28" class="paper-hole"></ellipse>
        <path class="accent-line" d="M66 160 H298"></path>
        <path class="frame" d="M112 160 Q128 128 152 126 Q184 122 210 130 Q236 136 252 160"></path>
        <path class="roof accent" d="M108 144 Q182 96 256 144"></path>
        <path class="frame light" d="M126 150 V174 M146 142 V178 M166 138 V180 M186 136 V180 M206 138 V180 M226 142 V178"></path>
      </g>

      <g v-else-if="variant === 'residence-diaolou'">
        <path class="ground" d="M42 208 H318"></path>
        <path class="roof accent" d="M170 78 Q188 58 206 78 T242 86"></path>
        <rect x="170" y="84" width="58" height="112" class="outline-fill"></rect>
        <path class="frame" d="M188 84 V196 M206 84 V196 M170 106 H228 M170 134 H228 M170 162 H228"></path>
        <path class="frame light" d="M184 96 H198 M202 96 H216 M184 124 H198 M202 124 H216 M184 152 H198 M202 152 H216"></path>
        <path class="roof" d="M84 170 Q126 150 170 162"></path>
        <path class="frame" d="M98 170 V206 M126 162 V206 M154 164 V206"></path>
      </g>

      <g v-else-if="variant === 'residence-stilted'">
        <path class="roof accent" d="M78 132 Q152 86 224 104 T310 84"></path>
        <path class="frame" d="M114 138 V206 M148 126 V206 M184 120 V206 M220 122 V206 M258 132 V206"></path>
        <path class="frame light" d="M108 154 H266 M104 170 H268"></path>
        <path class="accent-line" d="M82 182 Q160 170 236 176 T316 168"></path>
        <path class="frame" d="M72 188 L110 152 M78 204 L122 154"></path>
        <path class="shadow-fill" d="M112 154 H264 V172 H112 Z"></path>
      </g>

      <g v-else-if="variant === 'office-hall'">
        <path class="roof accent" d="M52 150 Q134 96 214 104 T308 90"></path>
        <path class="roof" d="M88 166 Q152 134 214 138 T282 132"></path>
        <path class="frame" d="M104 166 V208 M136 154 V208 M170 146 V208 M204 142 V208 M238 144 V208 M270 152 V208"></path>
        <path class="frame light" d="M84 178 H290 M76 190 H298 M68 202 H306"></path>
        <path class="accent-line" d="M126 190 H248"></path>
        <path class="frame" d="M38 182 H72 M292 182 H324"></path>
      </g>

      <g v-else-if="variant === 'office-gate'">
        <path class="roof accent" d="M48 140 Q132 84 216 98 T314 80"></path>
        <path class="frame" d="M92 142 V208 M128 130 V208 M168 120 V208 M206 118 V208 M246 126 V208 M284 138 V208"></path>
        <path class="frame light" d="M86 154 H290 M82 168 H294"></path>
        <path class="outline-fill" d="M128 168 H248 V206 H128 Z"></path>
        <path class="accent-line" d="M150 168 V206 M184 168 V206 M218 168 V206"></path>
        <path class="frame" d="M66 116 H92 M284 114 H310"></path>
      </g>

      <g v-else-if="variant === 'office-yamen'">
        <path class="roof accent" d="M54 146 Q136 94 216 104 T308 92"></path>
        <path class="roof" d="M92 176 Q144 154 198 156 T264 152"></path>
        <path class="frame" d="M106 148 V208 M140 136 V208 M176 128 V208 M212 126 V208 M248 132 V208 M282 144 V208"></path>
        <path class="frame light" d="M84 162 H296 M74 188 H306 M66 200 H314"></path>
        <path class="accent-line" d="M84 182 H296"></path>
        <path class="frame" d="M72 200 L112 200 M248 200 H292"></path>
      </g>

      <g v-else-if="variant === 'palace-hall'">
        <path class="roof accent" d="M36 144 Q132 74 226 88 T326 70"></path>
        <path class="roof" d="M74 124 Q148 80 222 86 T298 80"></path>
        <path class="frame" d="M92 136 V208 M126 120 V208 M162 108 V208 M198 104 V208 M236 110 V208 M272 124 V208"></path>
        <path class="frame light" d="M72 154 H296 M64 170 H304 M56 186 H312 M48 202 H320"></path>
        <path class="accent-line" d="M116 170 H248"></path>
        <path class="outline-fill" d="M94 152 H270 V184 H94 Z"></path>
      </g>

      <g v-else-if="variant === 'palace-gate'">
        <path class="roof accent" d="M38 136 Q136 76 234 88 T324 68"></path>
        <path class="roof" d="M92 116 Q144 86 198 90 T266 84"></path>
        <path class="frame" d="M82 120 V208 M116 106 V208 M154 94 V208 M192 90 V208 M230 94 V208 M268 106 V208 M302 120 V208"></path>
        <path class="frame light" d="M68 146 H316 M66 160 H318 M64 176 H320"></path>
        <path class="accent-line" d="M138 146 V208 M192 146 V208 M246 146 V208"></path>
        <path class="frame" d="M54 108 H80 M304 108 H332"></path>
      </g>

      <g v-else-if="variant === 'palace-tower'">
        <path class="roof accent" d="M178 64 Q194 44 210 64 T246 72"></path>
        <path class="roof" d="M154 104 Q192 80 230 88 T272 84"></path>
        <path class="roof accent" d="M132 148 Q188 118 246 126 T306 118"></path>
        <path class="frame" d="M176 72 V206 M198 72 V206 M220 80 V206 M242 96 V206"></path>
        <path class="frame light" d="M156 106 H268 M138 150 H304 M134 168 H308"></path>
        <path class="outline-fill" d="M170 116 H248 V146 H170 Z"></path>
        <path class="outline-fill" d="M150 158 H286 V190 H150 Z"></path>
        <path class="frame" d="M106 190 H142 M286 190 H322"></path>
      </g>

      <g v-else-if="variant === 'bridge-arch'">
        <path class="water" d="M24 194 Q56 188 88 194 T152 194 T216 194 T280 194 T336 194"></path>
        <path class="accent-line" d="M42 156 H318"></path>
        <path class="frame" d="M62 156 Q180 96 298 156"></path>
        <path class="frame light" d="M90 156 Q180 118 270 156"></path>
        <path class="frame" d="M68 156 L52 194 M292 156 L308 194"></path>
        <path class="frame light" d="M96 150 V164 M126 148 V166 M156 146 V168 M186 146 V168 M216 146 V168 M246 148 V166"></path>
      </g>

      <g v-else-if="variant === 'bridge-beam'">
        <path class="water" d="M24 200 Q52 194 80 200 T136 200 T192 200 T248 200 T304 200 T336 200"></path>
        <path class="accent-line" d="M38 150 H322"></path>
        <path class="frame" d="M50 150 H310"></path>
        <path class="frame light" d="M74 146 V194 M116 146 V194 M158 146 V194 M200 146 V194 M242 146 V194 M284 146 V194"></path>
        <path class="roof accent" d="M124 136 Q148 122 172 136"></path>
        <path class="roof accent" d="M194 136 Q218 122 242 136"></path>
        <path class="shadow-fill" d="M108 150 H256 V164 H108 Z"></path>
      </g>

      <g v-else-if="variant === 'bridge-corridor'">
        <path class="water" d="M20 200 Q46 192 72 200 T124 200 T176 200 T228 200 T280 200 T332 200"></path>
        <path class="roof accent" d="M54 132 Q108 100 162 110 T270 102 T324 92"></path>
        <path class="frame" d="M72 144 V196 M104 130 V196 M138 122 V196 M172 120 V196 M206 120 V196 M240 124 V196 M274 132 V196 M306 144 V196"></path>
        <path class="frame light" d="M62 156 H314 M58 170 H318"></path>
        <path class="accent-line" d="M90 144 Q118 126 146 144"></path>
        <path class="accent-line" d="M194 140 Q222 122 250 140"></path>
      </g>

      <circle cx="42" cy="34" r="4" class="seal-dot"></circle>
      <circle cx="58" cy="34" r="4" class="seal-dot soft"></circle>
      <circle cx="74" cy="34" r="4" class="seal-dot soft"></circle>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { SketchVariant } from '../types';

const props = withDefaults(
  defineProps<{
    variant: SketchVariant;
    accent?: string;
    ink?: string;
    muted?: boolean;
  }>(),
  {
    accent: '#4f7462',
    ink: '#5c4838',
    muted: false,
  },
);

const styleVars = computed(() => ({
  '--accent-color': props.accent,
  '--ink-color': props.ink,
  '--muted-opacity': props.muted ? '0.55' : '1',
}));
</script>

<style scoped lang="scss">
.architecture-sketch {
  width: 100%;
  height: 100%;
  color: var(--ink-color);
  opacity: var(--muted-opacity);
}

svg {
  display: block;
  width: 100%;
  height: 100%;
}

.paper {
  fill: transparent;
}

.roof,
.frame,
.ground,
.water,
.accent-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.roof,
.accent-line {
  stroke: var(--accent-color);
}

.roof {
  stroke-width: 5.2;
}

.frame,
.ground {
  stroke: color-mix(in srgb, var(--ink-color) 86%, #ffffff 14%);
  stroke-width: 2.3;
}

.frame.light,
.water {
  stroke: color-mix(in srgb, var(--ink-color) 48%, #ffffff 52%);
  stroke-width: 1.5;
}

.ground {
  opacity: 0.45;
}

.water {
  opacity: 0.6;
}

.accent-line {
  stroke-width: 2.3;
}

.outline-fill {
  fill: color-mix(in srgb, var(--accent-color) 10%, transparent);
  stroke: color-mix(in srgb, var(--ink-color) 68%, #ffffff 32%);
  stroke-width: 2;
}

.paper-hole {
  fill: rgba(239, 232, 217, 0.86);
  stroke: rgba(92, 72, 56, 0.22);
  stroke-width: 1.4;
}

.shadow-fill {
  fill: color-mix(in srgb, var(--accent-color) 8%, transparent);
  stroke: rgba(92, 72, 56, 0.14);
  stroke-width: 1.2;
}

.seal-dot {
  fill: color-mix(in srgb, var(--accent-color) 88%, #ffffff 12%);
}

.seal-dot.soft {
  opacity: 0.62;
}
</style>
