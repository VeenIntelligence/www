# 首页重型资产冻结与分批加载方案（修订版）

> 目标：优化首页多 section 场景下的 3D / 视频 / 大图性能。
>
> 核心约束：
> 1. 不做卸载，不销毁页面级组件。
> 2. 不对 `Hero` / `About` / `Product` 做硬编码。
> 3. 方案要支持未来新增 section 直接接入。

---

## 现状审计

阅读代码后的发现，用以校准方案的实际出发点。

### 重型资产清单

| Section | 重型组件 | RAF 循环 | 视频 | 大图 | 现有冻结机制 |
| ------- | -------- | -------- | ---- | ---- | ------------- |
| Hero | `WaveCanvas`（Three.js，670 行，全屏 SDF shader） | ✅ 永不停歇 | ✗ | ✗ | **无** — 始终全速跑 |
| About | `GlassCubeScene`（Three.js，452 行，SDF shader） | ✅ 有 IntersectionObserver 冻结 | ✅ demo-fallback.mp4（VideoTexture） | ✗ | **已有** — IntersectionObserver + visibilitychange |
| Product | 无 | ✗ | ✗ | ✅ 4 张大截图（eager + fetchPriority=high） | 无 |
| Services | 无（占位文字） | ✗ | ✗ | ✗ | 不需要 |
| Footer | 无 | ✗ | ✗ | ✗ | 不需要 |

### 关键发现

1. **`WaveCanvas` 是当前唯一需要新增冻结机制的重型组件。** 它永远在跑 RAF，占用 CPU/GPU 资源，即使用户已经滚到 About 或 Product 页。

2. **`GlassCubeScene` 已经实现了完整的冻结/唤醒机制：**
   - IntersectionObserver（threshold: `[0, 0.16, 0.35, 0.6]`，>= 0.35 判为可见）
   - `visibilitychange` 监听（tab 切走时暂停）
   - `startLoop()` / `stopLoop()` 控制 RAF 生命周期
   - 冻结时保留 renderer/scene/material/texture，不 dispose
   - 这个组件**不需要重新做**，它已经是正确的范本

3. **Product 截图：** 4 张图片全部设为 `loading="eager"` + `fetchPriority="high"`。但 Product 是第三屏，不是首屏资源，应改为 `loading="lazy"` + 去掉 `fetchPriority="high"`。

4. **视频：** `GlassCubeScene` 挂载时立即开始加载 demo-fallback.mp4，但 About 是第二屏。视频应延迟到 section 可见时才加载。

5. **滚动模式：** 首页已启用 `scroll-snap-type: y mandatory`，每次滚动精确锁定一个 section，意味着"当前 section"和"邻近 section"的判定很清晰，无需做复杂的模糊阈值。

---

## 对原方案的评审

### 正确的地方

- **渲染与加载分离**的理念是正确的，但当前代码体量还不需要一个完整的状态机（unloaded → preloading → ready → active → frozen）
- **先冻结，后优化加载时机**的优先级排序是对的
- **不要按页面名写入 if/else** 的工程约束是对的
- **冻结 ≠ 卸载** 的原则是正确的

### 过度设计的地方

1. **Section Registry + Asset Preload Manager + Render Gate 三层架构**：

   当前首页一共 5 个区域，只有 2 个重型组件（WaveCanvas、GlassCubeScene），其中一个已经自带冻结。引入带着 TypeScript 类型定义的 Registry + Manager + Gate 三层系统，对于一个 **2 组件的问题** 来讲太重了。

   正确的做法：写一个通用 hook，让每个重型组件自己声明"我是否需要冻结"，不需要中央调度器。

2. **SectionAsset 资源注册表**（url + kind + priority 元数据）：

   当前项目的资源就三类：2 个 Three.js scene（代码即资产，不是独立文件）、1 个 mp4、4 张截图。这些不是需要统一调度的"可发现资源"，它们是组件自己的依赖。引入注册表 = 把组件知道的东西再写一遍到另一个地方，增加维护负担。

3. **五个生命周期状态（unloaded / preloading / ready / active / frozen）**：

   对于当前场景太多了。实际上只需要两个信号：
   - `isActive`（在视口内 → 跑 RAF）
   - `!isActive`（不在视口内 → 停 RAF）

   preloading / ready 的区分在当前代码里没有用武之地 — Three.js scene 不需要预加载（代码就是资源），视频可以用原生 `preload="none"` 延迟，图片用 `loading="lazy"` 延迟。

4. **"Section Activity Observer" 输出 `isActive` / `isNear` / `isFar` + `intersectionRatio`**：

   `isNear` / `isFar` 的用途在原方案里只是决定"预加载还是不加载"。但结合 scroll-snap 行为，section 之间的切换是离散的（要么看到，要么没看到），不存在"模糊邻近"问题。一个 IntersectionObserver + 一个 threshold 就够了。

### 遗漏的地方

1. **ProductSection 截图的 `loading="eager"` + `fetchPriority="high"` 需要改**。原方案只笼统说"审核"，没有具体指出哪些资源有问题。

2. **`GlassCubeScene` 的视频立即加载问题**。About 是第二屏，但视频在组件挂载时就开始 `video.load()`。原方案没有注意到这一点。

3. **`WaveCanvas` 和 `GlassCubeScene` 的代码重复**。两个组件各自实现了一套几乎相同的自适应画质逻辑（frameTimes / fIdx / adaptQuality / upgradeQuality）。如果要真正提升工程质量，应该把这套逻辑提取为共享 hook。原方案完全没有提到这一点。

4. **原方案没有提到 `framer-motion` 的 `useScroll` + `useTransform`**。HeroSection、AboutSection、ProductSection 都使用了 framer-motion 的 scroll-driven 动画，这些在不可见时也会持续计算。虽然开销比 WebGL 小得多，但应在后续优化中考虑。

---

## 修订后的实施方案

### 核心策略

**做最少、收益最大的事。** 当前唯一无控制的重型资源是 `WaveCanvas`。GlassCubeScene 已经做好了。其他是简单的 HTML 属性调整。

### 第一步：给 `WaveCanvas` 加 IntersectionObserver 冻结（优先级 P0）✅ 已完成

**目标：** Hero 不可见时，停止 WaveCanvas 的 RAF 循环。

**做法：** 参照 `GlassCubeScene` 已有的模式（它是正确的范本），在 `WaveCanvas` 内部加入 IntersectionObserver + visibilitychange 监听。

需要修改的行为：

- 进入视口（intersectionRatio >= 阈值）→ 启动 RAF 循环
- 离开视口 → 停止 RAF 循环（`cancelAnimationFrame`）
- `visibilitychange` → tab 切走时也停止
- 冻结时保留 renderer / scene / material / uniforms / 液滴物理状态
- 唤醒时从当前状态继续，不重新初始化
- 冻结时释放拖拽状态（调用 `releaseDrag()`）

验收标准：

- [x] 滚动到 About 后，WaveCanvas 的 RAF 完全停止（可用 `console.log` 在 `tick()` 内验证）
- [x] 滚回 Hero 后，动画从当前物理状态无缝恢复
- [x] Tab 切走后，WaveCanvas 停止渲染
- [x] 没有发生 dispose 或 unmount

代码位置：`src/components/WaveCanvas.jsx`

预估改动量：约 30 行（对标 GlassCubeScene 的 345-413 行）

### 第二步：提取通用自适应画质 hook（优先级 P1）✅ 已完成

**目标：** 消除 `WaveCanvas` 和 `GlassCubeScene` 之间重复的画质自适应逻辑。

**现状：** 两个组件各自有几乎相同的一套逻辑：
- `frameTimes = new Float32Array(30)`
- `fIdx` 计数器
- `adaptQuality()` 函数（计算平均帧时间，动态调 scale）
- `upgradeQuality()` + `scheduleUpgrade()`
- `applyScale()` 函数

**做法：** 提取为 `src/hooks/useAdaptiveQuality.js`，返回：

```js
{
  scale,           // 当前缩放比
  activeTier,      // 当前画质等级
  applyScale,      // 手动触发 resize 时调用
  adaptFrame,      // 每帧末尾调用，自动调节
}
```

验收标准：

- [x] WaveCanvas 和 GlassCubeScene 不再各自维护 frameTimes / fIdx / adaptQuality
- [x] 两个组件的画质行为与提取前完全一致
- [x] Build 通过

### 第三步：延迟 About 视频加载（优先级 P1）✅ 已完成

**目标：** demo-fallback.mp4 不在首屏加载，节省首屏带宽。

**现状：** `GlassCubeScene` 挂载时立即 `video.src = DEMO_VIDEO_PATH; video.load()`。

**做法：** 利用 GlassCubeScene 已有的 IntersectionObserver：
- 首次 `sceneVisible = true` 时才设置 `video.src` 并调用 `video.load()`
- 离开视口时暂停视频：`video.pause()`
- 重新进入视口时恢复播放：`video.play()`

验收标准：

- [x] 首次加载首页时，网络面板中 demo-fallback.mp4 不出现在首屏请求中
- [x] 滚动到 About 后视频正常加载和播放
- [x] 离开 About 后视频暂停
- [x] 返回 About 后视频恢复播放

代码位置：`src/components/GlassCubeScene.jsx`（约 222-249 行区域）

### 第四步：修正 Product 截图加载优先级（优先级 P1）✅ 已完成

**目标：** Product 是第三屏，截图不应抢占首屏带宽。

**现状：** `ProductScreenshot` 组件写死了 `loading="eager"` + `fetchPriority="high"`。

**做法：**

```diff
- loading="eager"
+ loading="lazy"
- fetchPriority="high"
```

验收标准：

- [ ] 网络面板中 screenshot1/2.jpg 不再出现在首屏的高优先级请求中
- [ ] 滚动到 Product 后图片按需加载
- [ ] Build 通过

代码位置：`src/pages/home/ProductSection.jsx`（约 20-22 行）

### 第五步（可选）：冻结逻辑抽为通用 hook（优先级 P2）

**注意：** 这一步只在未来新增第三个重型组件时才需要做。当前只有两个，不值得过早抽象。

如果未来确实需要，建议的 API：

```js
// src/hooks/useSectionFreeze.js
const { shouldAnimate } = useSectionFreeze(containerRef, {
  threshold: 0.35,      // IntersectionObserver 可见阈值
  respectPageVisibility: true,  // 是否响应 tab 切换
});
```

这个就是一个把 IntersectionObserver + visibilitychange 封装起来的 hook，不需要中央调度器、不需要注册表、不需要资产清单。

---

## 实施顺序与依赖关系

```
第一步（P0）：WaveCanvas 冻结
    ↓
第二步（P1）：提取自适应画质 hook  ← 依赖第一步（先稳定了 WaveCanvas 的生命周期再提取）
    ↓                    ↘
第三步（P1）：延迟视频加载    第四步（P1）：修正图片优先级  ← 这两步互相独立，可并行
    ↓
第五步（P2）：通用冻结 hook（按需）
```

---

## 不做清单（明确排除）

| 不做的事 | 原因 |
| -------- | ---- |
| Section Registry 注册表 | 只有 2 个重型组件，不需要中央注册 |
| Asset Preload Manager 预加载管理器 | Three.js scene 不需要预加载（代码 = 资源），视频和图片用原生属性即可 |
| Render Gate 三信号协议 | 重型组件只需要 `shouldAnimate` 一个布尔值，不需要三个 |
| 五状态生命周期 | 两状态（active / frozen）够用 |
| `isNear` / `isFar` 分级 | scroll-snap 模式下切换是离散的，不需要模糊邻近判定 |
| 卸载 / dispose | 明确不做，保留冻结策略 |

---

## 风险与取舍

### 风险 1：冻结后内存不会下降

**已接受。** 本次优化目标是 CPU / GPU 实时渲染压力和首屏网络竞争，不是内存回收。

### 风险 2：WaveCanvas 冻结后的唤醒时间跳变

`WaveCanvas` 的 `tick()` 用 `performance.now() - startTime` 计算时间。冻结期间时间流逝但帧没跑，唤醒后 `uTime` 会跳变。需要在停止/恢复 RAF 时调整 `startTime` 或记录冻结总时长做偏移。

**缓解方案：** 在 `stopLoop()` 时记录 `freezeStart`，在 `startLoop()` 时用 `startTime += (now - freezeStart)` 补偿。

### 风险 3：GlassCubeScene 视频延迟加载后首次播放可能有闪烁

**缓解方案：** 在 `canplay` 事件触发后再设置 `uCameraActive = 1.0`（当前代码已经这样做了），所以视频加载期间 shader 使用程序化背景，切换是平滑的。

---

## 验收标准（整体）

- [ ] WaveCanvas 在不可见时 RAF 停止（DevTools Performance 面板可验证）
- [ ] GlassCubeScene 的已有冻结行为不受影响
- [ ] 首屏网络请求中不包含 demo-fallback.mp4 和 Product 截图
- [ ] 整体 `npx vite build` 通过
- [ ] 新增 section 时只需接入通用 hook（如果已实施第五步），或在组件内部自行添加 IntersectionObserver（最小方案）
