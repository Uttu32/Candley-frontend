import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { ArrowRight, Check, Flame, Heart, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { aboutPhilosophy, aboutValues, fragranceFamilies, makingProcess, moods, rituals } from '../data/aboutContent'
import { triggerToast } from '../components/common/ToastContainer'
import { api } from '../services/api'
import { useAppStore } from '../store/useAppStore'

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: 'easeOut' } },
}

const AboutPage = () => {
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, wishlist } = useAppStore()
  const [selectedMood, setSelectedMood] = useState(0)
  const productsQuery = useQuery({ queryKey: ['products', 'about'], queryFn: () => api.products(new URLSearchParams({ limit: '100' })), retry: false })
  const products = productsQuery.data?.items ?? []

  return (
    <main className="about-page">
      <section className="about-hero">
        <img src="/images/lotus-urli-candle.png" alt="A glowing Candley Aroma candle ritual" />
        <div className="about-hero-overlay" />
        <motion.div className="about-hero-copy" initial="hidden" animate="visible" variants={reveal}>
          <span className="eyebrow">Our story</span>
          <h1>More Than a Candle.<br /><em>A Moment Worth Remembering.</em></h1>
          <p>We believe a candle does more than illuminate a room. It creates an atmosphere, evokes emotions, and turns ordinary moments into beautiful rituals.</p>
          <Link to="/shop" className="primary-button">Explore our candles <ArrowRight size={16} /></Link>
        </motion.div>
      </section>

      <motion.section className="about-intro container" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
        <div className="about-intro-image"><img src="/images/musk-rose-candle.png" alt="Rose-shaped Musk Rose candle in a glass vessel" /></div>
        <div className="about-intro-copy">
          <span className="eyebrow">The art of candlelight</span>
          <h2>We Create Fragrance for the Moments That Matter.</h2>
          <p>From the first flicker of a flame to the final trace of fragrance, every candle is designed to transform the atmosphere around you.</p>
          <p>Our candles are created for slow mornings, quiet evenings, celebrations, intimate conversations and the little moments in between.</p>
          <p>Because sometimes, the smallest glow can change the entire mood of a room.</p>
        </div>
      </motion.section>

      <section className="about-philosophy container section-spacing">
        <div className="about-section-heading"><span className="eyebrow">The feeling of fragrance</span><h2>A Candle Is More Than Light</h2></div>
        <div className="philosophy-grid">
          {aboutPhilosophy.map((item) => (
            <motion.article key={item.number} className="philosophy-item" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
              <span className="philosophy-number">{item.number}</span><span className="eyebrow">{item.label}</span><h3>{item.title}</h3><p>{item.copy}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="craft-section container section-spacing">
        <div className="craft-image"><img src="/images/musk-rose-collection.png" alt="Two rose candles prepared for a quiet ritual" /></div>
        <div className="craft-copy"><span className="eyebrow">The craft behind the flame</span><h2>Thoughtfully Made. Beautifully Burned.</h2><p>Every candle begins with a careful balance of wax, fragrance and flame.</p><p>From selecting the right wax blend to testing the wick and refining the fragrance throw, every detail matters.</p><p>Our approach is simple: create candles that look beautiful, smell exceptional and burn beautifully.</p><div className="craft-note"><Flame size={18} /><span>Considered details, from first pour to final burn.</span></div></div>
      </section>

      <section className="process-section section-spacing"><div className="container"><div className="about-section-heading"><span className="eyebrow">The making of a moment</span><h2>From Wax to Flame</h2></div><div className="process-grid">{makingProcess.map(([number, title, copy]) => <motion.article key={number} className="process-item" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={reveal}><span>{number}</span><h3>{title}</h3><p>{copy}</p></motion.article>)}</div></div></section>

      <section className="fragrance-section container section-spacing"><div className="about-section-heading"><span className="eyebrow">Find your notes</span><h2>A World of Fragrance</h2><p>Every room has a mood. Find the family that feels like yours.</p></div><div className="fragrance-grid">{fragranceFamilies.map(([title, copy, slug]) => <Link key={title} to={`/category/${slug}`} className="fragrance-tile"><span>{title}</span><small>{copy}</small><ArrowRight size={16} /></Link>)}</div></section>

      <section className="mood-section section-spacing"><div className="container"><div className="about-section-heading"><span className="eyebrow">Choose your atmosphere</span><h2>What Does Your Space Feel Like Today?</h2></div><div className="mood-layout"><div className="mood-list">{moods.map(([title], index) => <button key={title} type="button" className={`mood-button ${selectedMood === index ? 'active' : ''}`} onClick={() => setSelectedMood(index)}><span>0{index + 1}</span><strong>{title}</strong><ArrowRight size={16} /></button>)}</div><motion.div className="mood-feature" key={selectedMood} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}><img src={selectedMood % 2 === 0 ? '/images/musk-rose-candle.png' : '/images/lotus-urli-candle.png'} alt={`${moods[selectedMood][0]} candle atmosphere`} /><div><span className="eyebrow">{moods[selectedMood][0]}</span><p>{moods[selectedMood][1]}</p><Link to={`/category/${moods[selectedMood][2]}`} className="text-button">Explore this mood <ArrowRight size={15} /></Link></div></motion.div></div></div></section>

      <section className="ritual-section container section-spacing"><div className="about-section-heading"><span className="eyebrow">Small rituals, beautifully lived</span><h2>Turn the Everyday Into a Ritual</h2></div><div className="ritual-grid">{rituals.map(([time, title, copy], index) => <article key={time} className="ritual-item"><img src={index % 2 === 0 ? '/images/musk-rose-collection.png' : '/images/lotus-urli-candle.png'} alt={`${time.toLowerCase()} candle ritual`} /><div><span>{time}</span><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>

      <section className="care-section container section-spacing"><div className="care-copy"><span className="eyebrow">A little care goes a long way</span><h2>Make Every Burn Beautiful</h2><p>Allow the wax to melt evenly across the surface during the first burn. Keep the wick trimmed appropriately before lighting and avoid burning continuously for excessive periods.</p><p>Always place your candle on a stable, heat-resistant surface away from drafts and flammable objects. Never leave a burning candle unattended.</p><Link to="/shop" className="secondary-button">Discover candle care <ArrowRight size={15} /></Link></div><div className="care-image"><img src="/images/lotus-urli-candle.png" alt="Candle flame on a stable decorative holder" /></div></section>

      <section className="responsibility-section"><div className="container responsibility-inner"><span className="eyebrow">Designed with intention</span><h2>Beautiful products should be thoughtfully considered at every stage.</h2><p>From the ingredients we select to the packaging they arrive in, we keep our attention on the experience of bringing fragrance into your home.</p></div></section>

      <section className="people-section container section-spacing"><div className="people-image"><img src="/images/musk-rose-collection.png" alt="Candles and flowers arranged for a fragrance ritual" /></div><div className="people-copy"><span className="eyebrow">The people behind the brand</span><h2>Made With Curiosity, Care & a Love for Fragrance</h2><p>Candley is shaped by a small, curious creative practice that pays attention to scent, light, texture and the feeling a beautiful object brings into a room.</p><p>Our stories are still being written. What remains constant is a love for making fragrance feel personal, generous and easy to live with.</p></div></section>

      <section className="values-section container section-spacing"><div className="about-section-heading"><span className="eyebrow">What guides us</span><h2>Our Values</h2></div><div className="values-grid">{aboutValues.map(([title, copy]) => <article key={title}><Check size={18} /><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

      <section className="about-quote"><img src="/images/lotus-urli-candle.png" alt="Candle flame glowing in a warm room" /><div><Sparkles size={20} /><blockquote>“Light a candle.<br />Slow down.<br />Let the moment linger.”</blockquote></div></section>

      <section className="promise-section container section-spacing"><span className="eyebrow">Our promise</span><h2>Beautiful Scents. Meaningful Moments.</h2><p>We create candles for more than beautiful rooms. We create them for the quiet moments, the celebrations, the conversations, the pauses and the memories that make a house feel like home.</p><Link to="/shop" className="primary-button">Explore the collection <ArrowRight size={16} /></Link></section>

      {products.length > 0 && <section className="related-section container section-spacing"><div className="about-section-heading"><span className="eyebrow">You may also love</span><h2>Bring the feeling home</h2></div><div className="related-grid">{products.slice(0, 4).map((product) => { const isLiked = wishlist.includes(product.id); return <article key={product.id} className="related-card"><button type="button" className={`wishlist-button ${isLiked ? 'active' : ''}`} aria-label={isLiked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} onClick={() => { toggleWishlist(product.id); triggerToast(isLiked ? 'Removed from wishlist' : 'Added to wishlist') }}><Heart size={16} fill={isLiked ? 'currentColor' : 'none'} /></button><button type="button" className="related-card-image" onClick={() => navigate(`/product/${product.slug}`)}><img src={product.images[0]} alt={product.name} /></button><div><h3>{product.name}</h3><div className="related-card-price"><span>★ {product.rating}</span><strong>₹{product.price}</strong></div><button type="button" className="primary-button small" onClick={() => { addToCart(product.id, 1, product.variants?.[0]?.id); triggerToast('Added to cart') }}>Add to cart</button></div></article> })}</div></section>}
    </main>
  )
}

export default AboutPage
