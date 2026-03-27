import { useLanguage } from '../../../../context/useLanguage';

/**
 * Project Σ Manifesto — 文章渲染组件
 *
 * 文件位置: src/pages/blog/posts/project-sigma-manifesto/index.jsx
 *
 * 设计理念：
 *   每篇文章就是一个完整的 React 组件，可以包含：
 *   - 静态文本内容（HTML/JSX）
 *   - 动画效果（CSS/Canvas/WebGL）
 *   - 交互式图表或可视化
 *   - 嵌入视频或音频
 *
 *   这比 Markdown 字符串更灵活——你获得了 React 的全部能力。
 *   文章内容直接作为 JSX 编写，用 CSS 类名匹配 blog.css 中的样式。
 */

/** 英文正文 */
function EnglishContent() {
  return (
    <>
      <h2 className="blog-h2">Manifesto</h2>
      <p className="blog-p">
        Over the past thirty years, the internet delivered half its promise — connecting 5 billion people. But the other half — <strong>making humanity collectively smarter through connection</strong> — was never delivered. In fact, it went in the opposite direction.
      </p>
      <p className="blog-p">
        Gen Z is the first generation with lower average IQ than their parents. Today's social platforms are not infrastructure for wisdom — they are <strong>attention extraction machines</strong>. Algorithms don't optimize your cognitive growth; they optimize your dwell time. They don't care if you're smarter than yesterday; they only care if you scrolled longer.
      </p>
      <p className="blog-p">
        The result: misinformation spreads 6x faster than truth. For the first time in history, humanity has species-wide connectivity — and used it to create species-wide cognitive regression.
      </p>
      <p className="blog-p">
        <strong>Bots, algorithm manipulation, bribe-style opinion campaigns</strong> — these are not bugs of the internet. They are features of the current paradigm. When platforms are ad-revenue-driven, the cost of producing junk content is zero, and the cost of verification falls on every user — <strong>Gresham's Law kicks in: bad money drives out good, noise drowns signal</strong>.
      </p>
      <p className="blog-p">
        <strong>Project Σ believes this is not a failure of human nature, but a failure of infrastructure.</strong>
      </p>
      <p className="blog-p">Our core hypothesis is extremely simple and extremely bold:</p>
      <blockquote className="blog-blockquote">
        <strong>Humans naturally desire higher quality, more unique, deeper, more authentic content. The current system's collapse isn't because people don't want progress — it's because the system never rewarded progress.</strong>
      </blockquote>
      <p className="blog-p">If you change the incentive structure, you change the direction of emergence.</p>
      <p className="blog-p"><strong>Project Σ is that change.</strong></p>

      <h2 className="blog-h2">What We're Building</h2>
      <p className="blog-p">
        <strong>Project Σ is building the next-generation infrastructure protocol for human intellectual exchange.</strong>
      </p>
      <p className="blog-p">
        It is not "a better social media." It is a <strong>protocol-layer reconstruction</strong> of the fundamental question of how information flows, is evaluated, settles, and evolves between humans.
      </p>

      <h3 className="blog-h3">The Four Pillars</h3>
      <hr className="blog-hr" />

      <h3 className="blog-h3">Ⅰ. Proof of Humanity Without Identity</h3>
      <p className="blog-p"><strong>Problem</strong>: The current internet cannot distinguish one real person from ten thousand bots.</p>
      <p className="blog-p">
        <strong>Our Solution</strong>: Zero-knowledge proof of unique personhood — the system can confirm <strong>you are a unique real person</strong> without knowing <strong>who you are</strong>. No identity exposure, no biometric data hosting, no centralized identity database.
      </p>
      <p className="blog-p">
        The system is designed to be <strong>anti-Sybil + anti-bribery</strong> — one entity cannot create multiple identities to manipulate consensus, and bribery is designed to be unprofitable at the game-theory level.
      </p>
      <p className="blog-p"><strong>This is not a feature. This is the foundation.</strong> Without this layer, everything else is a castle built on sand.</p>

      <hr className="blog-hr" />

      <h3 className="blog-h3">Ⅱ. The Σ Engine</h3>
      <p className="blog-p">This is the core heart of Project Σ.</p>
      <p className="blog-p">
        We use <strong>math and code</strong> — not subjective review, not upvote/downvote — to evaluate every piece of content's information-theoretic contribution to collective intelligence.
      </p>
      <blockquote className="blog-blockquote">
        Every message is evaluated not by whether it's "good," but by <strong>how much genuine information increment it provides relative to the receiver's existing cognitive map</strong>.
      </blockquote>
      <p className="blog-p">
        This comes from the intersection of information theory and educational psychology: <strong>Shannon's information entropy × Vygotsky's Zone of Proximal Development</strong>. We are the first to implement this as a <strong>computable, verifiable protocol</strong> at the engineering level.
      </p>

      <hr className="blog-hr" />

      <h3 className="blog-h3">Ⅲ. Cognitive Topology Network</h3>
      <p className="blog-p">Project Σ doesn't use flat "follow/follower" social graphs.</p>
      <p className="blog-p">
        We build a <strong>multi-dimensional cognitive topology space</strong> — each user is a point, positioned by their cognitive state, not their social relationships.
      </p>
      <p className="blog-p">
        Content flows like water — naturally from high potential to low potential — but <strong>the flow itself reshapes the terrain</strong>. Built-in <strong>cross-domain collision mechanisms</strong> periodically introduce high-quality content from remote cognitive clusters as perturbation, preventing closed cognitive islands.
      </p>

      <hr className="blog-hr" />

      <h3 className="blog-h3">Ⅳ. The Bazaar of Currencies</h3>
      <p className="blog-p">
        Project Σ is not a platform. It is a <strong>protocol</strong>. On this protocol, anyone can fork their own Tribe, issue their own token, define their own rules for evaluating wisdom.
      </p>
      <p className="blog-p">This is Eric Raymond's <em>The Cathedral and the Bazaar</em> realized in the domain of collective intelligence:</p>
      <blockquote className="blog-blockquote">
        <strong>Don't try to define wisdom in one cathedral. Let a thousand bazaars compete.</strong>
      </blockquote>
      <p className="blog-p">
        Tokens are not speculative instruments — they are <strong>quantified certificates of wisdom contribution</strong>. For the first time, humanity has created a system where <strong>wisdom has a price, discovered in real-time by a free market</strong>.
      </p>

      <h2 className="blog-h2">Why Now</h2>
      <p className="blog-p">Three forces are simultaneously maturing in 2024-2026:</p>
      <ol className="blog-ol">
        <li><strong>Zero-knowledge proof technology</strong> has gone from academic papers to engineering-ready</li>
        <li><strong>Large language models</strong> have driven the cost of producing fake content to near-zero — making our system more necessary than ever</li>
        <li><strong>Global trust in existing social platforms has hit historic lows</strong></li>
      </ol>
      <p className="blog-p"><strong>The window is open. The question is not "should we build this," but "who builds it first."</strong></p>

      <h2 className="blog-h2">Core Belief</h2>
      <blockquote className="blog-blockquote">
        <em>"We don't believe humans got dumber in the information age.</em><br />
        <em>We believe the information age's infrastructure was never designed to make humans smarter.</em><br />
        <em>Σ is that overdue correction.</em><br /><br />
        <em>Not another platform. Another paradigm.</em><br />
        <em>Not a better algorithm. Better incentives.</em><br />
        <em>Not managing users. Liberating humanity.</em><br /><br />
        <em>Σ is the summation symbol.</em><br />
        <em>We're summing all of human wisdom.</em><br />
        <em>And we believe that sum can be greater than the sum of its parts.</em><br /><br />
        <em>Far greater."</em>
      </blockquote>
    </>
  );
}

/** 中文正文 */
function ChineseContent() {
  return (
    <>
      <h2 className="blog-h2">宣言</h2>
      <p className="blog-p">
        过去三十年，互联网兑现了它一半的承诺——连接了 50 亿人。但另一半承诺——<strong>让人类因连接而变得更聪明</strong>——不仅没有兑现，反而走向了它的反面。
      </p>
      <p className="blog-p">
        Z世代是第一代比他们父母平均智商下降的一代，今天的社交平台不是智慧的基础设施，而是<strong>注意力的榨取机器</strong>。算法不优化你的认知成长，它优化的是你的停留时长。它不在乎你是否比昨天更聪明，它只在乎你是否比昨天刷得更久。
      </p>
      <p className="blog-p">
        结果是：虚假信息的传播速度是真实信息的 6 倍。人类有史以来第一次拥有了全物种互联的能力，却用它制造了全物种规模的认知倒退。
      </p>
      <p className="blog-p">
        <strong>水军、机器人、算法操纵、贿选式舆论干预</strong>——它们不是互联网的 bug，它们是当前范式的 feature。当平台靠广告收入驱动，劣质内容的生产成本为零，而鉴别成本由每一个用户承担——<strong>格雷欣法则必然生效：劣币驱逐良币，噪音淹没信号</strong>。
      </p>
      <p className="blog-p">
        <strong>Project Σ 认为，这不是人性的失败，而是基础设施的失败。</strong>
      </p>
      <p className="blog-p">我们的核心假设极其简单，也极其大胆：</p>
      <blockquote className="blog-blockquote">
        <strong>人类天生渴望更高质量、更独特、更有深度的真实内容。当前系统的崩坏不是因为人不想进步，而是因为系统从未奖励过进步。</strong>
      </blockquote>
      <p className="blog-p">如果你改变激励结构，你就改变了涌现的方向。</p>
      <p className="blog-p"><strong>Project Σ 就是这个改变。</strong></p>

      <h2 className="blog-h2">我们在构建什么</h2>
      <p className="blog-p">
        <strong>Project Σ 正在打造下一代人类智慧交流的基础设施协议。</strong>
      </p>
      <p className="blog-p">
        它不是一个"更好的社交媒体"。它是对信息如何在人类之间流动、评估、沉淀、进化这一根本问题的<strong>协议层重构</strong>。
      </p>

      <h3 className="blog-h3">四大支柱</h3>
      <hr className="blog-hr" />

      <h3 className="blog-h3">Ⅰ. 真人屏障 —— Proof of Humanity Without Identity</h3>
      <p className="blog-p">
        <strong>问题</strong>：当前互联网无法区分一个真人和一万个机器人。一切民主机制、声誉系统、投票治理，都建立在"一个账号 = 一个人"的假设上。这个假设在今天已经彻底破产。
      </p>
      <p className="blog-p"><strong>我们的方案</strong>：</p>
      <p className="blog-p">
        Project Σ 在协议层实现<strong>零知识证明级别的真人验证</strong>——系统可以确认：<strong>你是一个独一无二的真人</strong>，但系统无法知道：<strong>你是谁</strong>。
      </p>
      <p className="blog-p">
        该系统被设计为<strong>抗 Sybil（女巫攻击）+ 抗贿选</strong>——一个实体无法创建多个身份来操纵共识，经济激励的贿赂行为在博弈论层面被设计为不可获利。
      </p>
      <p className="blog-p"><strong>这不是功能，这是地基。</strong>没有这一层，后面的一切都是沙上城堡。</p>

      <hr className="blog-hr" />

      <h3 className="blog-h3">Ⅱ. 智慧熵引擎 —— The Σ Engine</h3>
      <p className="blog-p">这是 Project Σ 的核心心脏。</p>
      <p className="blog-p">
        我们用<strong>数学和代码</strong>——不是主观评审、不是点赞投票——来评估每一条内容对集体智慧的信息论贡献。
      </p>
      <blockquote className="blog-blockquote">
        每一条消息被评估的不是"好不好"，而是它<strong>相对于接收者已有认知图谱，提供了多少真正的信息增量</strong>。
      </blockquote>
      <p className="blog-p">
        这来自信息论与教育心理学的交叉：<strong>Shannon 的信息熵 × Vygotsky 的最近发展区</strong>。我们第一次在工程层面将它实现为一个<strong>可计算、可验证的协议</strong>。
      </p>

      <hr className="blog-hr" />

      <h3 className="blog-h3">Ⅲ. 认知拓扑网络 —— Cognitive Topology</h3>
      <p className="blog-p">Project Σ 不使用"关注/粉丝"这种扁平的社交图谱。</p>
      <p className="blog-p">
        我们构建的是一个<strong>多维认知拓扑空间</strong>——每个用户在其中是一个点，位置由其认知状态决定，而不是由社交关系决定。
      </p>
      <p className="blog-p">
        内容像水一样，自然地从高势能流向低势能，但流动本身改变了地形。内置<strong>跨域碰撞机制</strong>——周期性引入来自远距离认知簇的高质量内容作为扰动，防止形成封闭的认知孤岛。
      </p>

      <hr className="blog-hr" />

      <h3 className="blog-h3">Ⅳ. 多部落代币经济 —— The Bazaar of Currencies</h3>
      <p className="blog-p">
        Project Σ 不是一个平台，而是一个<strong>协议</strong>。在这个协议上，任何人可以 fork 自己的部落（Tribe），发行自己的代币，定义自己的智慧评估规则。
      </p>
      <p className="blog-p">这是 Eric Raymond 的《大教堂与集市》在集体智慧领域的实现：</p>
      <blockquote className="blog-blockquote">
        <strong>不要试图在一座大教堂里定义什么是智慧。让一千个集市去竞争。</strong>
      </blockquote>
      <p className="blog-p">
        代币不是投机工具，它是<strong>智慧贡献的量化凭证</strong>——你让社区变聪明了多少，你就获得多少。第一次，人类创造了一个<strong>智慧有价、且价格由自由市场实时发现</strong>的系统。
      </p>

      <h2 className="blog-h2">为什么是现在</h2>
      <p className="blog-p">三股力量在 2024-2026 年同时成熟：</p>
      <ol className="blog-ol">
        <li><strong>零知识证明技术</strong>已从学术论文走向工程可用</li>
        <li><strong>大语言模型的崛起</strong>使得虚假内容的生产成本趋近于零——人类比任何时候都更需要能区分真人智慧与机器噪音的基础设施</li>
        <li><strong>全球对现有社交平台的信任已经跌至历史低点</strong></li>
      </ol>
      <p className="blog-p"><strong>窗口已经打开。问题不是"要不要做"，而是"谁先做出来"。</strong></p>

      <h2 className="blog-h2">核心信念</h2>
      <blockquote className="blog-blockquote">
        <em>"我们不相信人类在信息时代变蠢了。</em><br />
        <em>我们相信信息时代的基础设施从未被设计来让人类变聪明。</em><br />
        <em>Σ 是那个迟到的修正。</em><br /><br />
        <em>不是另一个平台。是另一个范式。</em><br />
        <em>不是更好的算法。是更好的激励。</em><br />
        <em>不是管理用户。是释放人类。</em><br /><br />
        <em>Σ 是求和符号。</em><br />
        <em>我们求的是全人类智慧的总和。</em><br />
        <em>而我们相信那个总和可以大于部分之和。</em><br /><br />
        <em>远大于。"</em>
      </blockquote>
    </>
  );
}

/**
 * ProjectSigmaArticle — 文章主体组件
 *
 * 这是一个完整的 React 组件，接收 { lang } 属性。
 * 未来可以在这里添加：
 *   - 交互式图表
 *   - Canvas/WebGL 动画
 *   - 视频嵌入
 *   - 任何 JSX 可表达的内容
 */
export default function ProjectSigmaArticle() {
  const { lang } = useLanguage();
  return lang === 'zh' ? <ChineseContent /> : <EnglishContent />;
}
