const featuredProducts = [
  { name: "Rose Satin Dress", price: "GHS 520", tag: "New In" },
  { name: "Velvet Evening Set", price: "GHS 680", tag: "Best Seller" },
  { name: "Pearl Detail Blouse", price: "GHS 390", tag: "Limited" },
  { name: "Minimalist Tote", price: "GHS 260", tag: "Trending" },
];

const benefits = [
  "Free delivery in Accra",
  "Secure checkout",
  "Premium fabric quality",
  "Easy returns within 7 days",
];

export default function Home() {
  return (
    <main className="min-h-screen text-[#2d1c1c]">
      <header className="border-b border-[#f0dfe2] bg-[rgba(255,250,248,0.9)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f6dfe4] text-lg font-semibold text-[#7d3040]">
              S
            </div>
            <div>
              <p className="font-display text-2xl font-semibold tracking-tight text-[#2d1c1c]">
                Splendor
              </p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#7c5860]">
                Boutique
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#4f363b] md:flex">
            <a href="#new">New Arrivals</a>
            <a href="#collection">Collections</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden rounded-full border border-[#e3c0c8] px-4 py-2 text-sm font-medium text-[#3f2b2f] md:inline-flex">
              Sign In
            </button>
            <button className="rounded-full bg-[#d87b8b] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(216,123,139,0.28)] transition hover:bg-[#c96d7f]">
              Shop Now
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-[#a55b6d]">
            Curated for confident women
          </p>
          <h1 className="max-w-xl text-5xl leading-[0.96] text-[#2d1c1c] sm:text-6xl lg:text-7xl">
            Grace in every stitch.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#5b4348]">
            Discover refined silhouettes, soft fabrics, and statement essentials designed for everyday elegance.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button className="rounded-full bg-[#d87b8b] px-7 py-3.5 text-base font-semibold text-white shadow-[0_14px_32px_rgba(216,123,139,0.26)] transition hover:bg-[#c86f81]">
              Explore Collection
            </button>
            <button className="rounded-full border border-[#e5c3ca] bg-white px-7 py-3.5 text-base font-semibold text-[#3d2b2f] transition hover:border-[#d196a5] hover:bg-[#fff7f9]">
              View Lookbook
            </button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-[#5b4348]">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#d87b8b]" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-6 top-10 h-48 w-48 rounded-full bg-[#f5dfe4] blur-3xl" />
          <div className="absolute -right-6 bottom-6 h-52 w-52 rounded-full bg-[#f3decd] blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-[#f0dfe2] bg-[#fffdfd] p-4 shadow-[0_35px_80px_rgba(98,62,70,0.12)]">
            <div className="overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#f9e9ec,#f6dfe5_40%,#f0dbc7)] p-5">
              <div className="mb-5 flex items-center justify-between text-sm text-[#5d4148]">
                <span className="rounded-full bg-white/70 px-3 py-1 font-medium">Spring Edit</span>
                <span className="rounded-full bg-[#fff] px-3 py-1 font-medium">New</span>
              </div>

              <div className="relative mx-auto flex h-[430px] w-full max-w-[380px] items-end justify-center overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(235,198,202,0.4)_30%,_rgba(177,130,117,0.2)_100%)]">
                <div className="absolute inset-x-10 bottom-0 h-24 rounded-t-[50%] bg-[#f1d7c3] opacity-80 blur-2xl" />
                <div className="relative h-[380px] w-[260px] rounded-[32%_32%_18%_18%/22%_22%_16%_16%] bg-[linear-gradient(180deg,#f3d9d6,#d29aa3_28%,#7c565f_100%)] shadow-[inset_0_20px_30px_rgba(255,255,255,0.35),0_28px_50px_rgba(93,52,63,0.25)]" />
                <div className="absolute bottom-14 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full border-[16px] border-[#f9efe8] bg-[#f4d6db] opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="new" className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#a55b6d]">
              New arrivals
            </p>
            <h2 className="mt-2 text-4xl text-[#2d1c1c]">Most loved pieces</h2>
          </div>
          <button className="hidden rounded-full border border-[#dfc1c8] px-5 py-2.5 text-sm font-semibold text-[#3f2b2f] md:inline-flex">
            View All
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map((product) => (
            <article key={product.name} className="group rounded-[1.7rem] border border-[#f2dfe4] bg-white p-4 shadow-[0_18px_35px_rgba(112,68,77,0.04)]">
              <div className="mb-4 overflow-hidden rounded-[1.3rem] bg-[linear-gradient(135deg,#f7e7ed,#efe5db)]">
                <div className="h-72 rounded-[1.3rem] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.7),_rgba(219,185,192,0.45)_30%,_rgba(164,105,118,0.2)_100%)]" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#f9edf0] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a35c6e]">
                  {product.tag}
                </span>
                <span className="text-xl font-semibold text-[#2d1c1c]">{product.price}</span>
              </div>
              <h3 className="mt-4 text-2xl text-[#2d1c1c]">{product.name}</h3>
              <button className="mt-5 w-full rounded-full border border-[#e7c7ce] bg-[#fff9fa] px-4 py-2.5 text-sm font-semibold text-[#39272d] transition group-hover:bg-[#f6dfe4]">
                Add to cart
              </button>
            </article>
          ))}
        </div>
      </section>

      <section id="collection" className="mx-auto mt-16 max-w-7xl px-6 py-8 lg:px-8">
        <div className="rounded-[2rem] border border-[#f0dfe2] bg-[linear-gradient(135deg,#fcf3f4,#fffaf6)] p-7 shadow-[0_20px_50px_rgba(112,68,77,0.05)] md:p-10">
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a576e]">Signature edit</p>
              <h2 className="mt-3 text-4xl leading-tight text-[#2d1c1c]">
                Soft power, modern romance.
              </h2>
            </div>
            <p className="text-lg leading-8 text-[#5b4348]">
              From elegant daywear to statement occasion styles, our collections are shaped for confident femininity and effortless versatility.
            </p>
          </div>
        </div>
      </section>

      <footer id="contact" className="mt-20 border-t border-[#f1dfe2] bg-[#fffaf8]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 text-[#5a4247] md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-display text-3xl text-[#2d1c1c]">Splendor</p>
            <p className="mt-2 text-sm">Boutique essentials for the modern woman.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <a href="#">Instagram</a>
            <a href="#">Shipping</a>
            <a href="#">Returns</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
