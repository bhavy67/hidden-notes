import Nav from './components/Nav'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import Invisible from './components/Invisible'
import Shortcuts from './components/Shortcuts'
import FAQ from './components/FAQ'
import Download from './components/Download'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8]">
      <Nav />
      <Hero />
      <HowItWorks />
      <Features />
      <Invisible />
      <Shortcuts />
      <FAQ />
      <Download />
      <Footer />
    </div>
  )
}
