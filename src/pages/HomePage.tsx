import { ArrowRight, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { triggerToast } from "../components/common/ToastContainer";
import { useAppStore } from "../store/useAppStore";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

export const HomePage = () => {
  const { addToCart, toggleWishlist, wishlist } = useAppStore();
  const navigate = useNavigate();
  const productsQuery = useQuery({
    queryKey: ["products", "home"],
    queryFn: () =>
      api.products(new URLSearchParams({ sort: "featured", limit: "20" })),
    retry: false,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories,
    retry: false,
  });
  const heroQuery = useQuery({
    queryKey: ["heroSlides"],
    queryFn: api.heroSlides,
    retry: false,
  });
  const products = productsQuery.data?.items ?? [];
  const categories = categoriesQuery.data ?? [];
  const heroSlides = (heroQuery.data ?? []).filter(
    (slide) => slide.active !== false,
  );  

  return (
    <div className="home-page">
      <section className="relative h-[80vh] min-h-[520px] w-full overflow-hidden">
        {heroSlides.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              No hero media has been published yet.
            </div>
          </div>
        ) : (
          <Swiper
            modules={[Autoplay, Pagination, EffectFade]}
            effect="fade"
            fadeEffect={{
              crossFade: true,
            }}
            loop={heroSlides.length > 1}
            autoplay={{
              delay: 4500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            pagination={{
              clickable: true,
            }}
            speed={1000}
            className="!h-full !w-full"
          >
            {heroSlides.map((slide, index) => (
              <SwiperSlide
                key={slide._id ?? `${slide.heading}-${index}`}
                className="!relative !h-full !w-full"
              >
                {/* Image */}
                <img
                  src={slide.desktopImage}
                  alt={slide.heading || "Hero banner"}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 z-10 flex items-end">
                  <div className="mx-auto w-full max-w-7xl px-6 pb-24 md:px-10 md:pb-28 lg:px-16 lg:pb-32">
                    <div className="max-w-2xl text-left text-white">
                      {slide.heading && (
                        <h1 className="mb-4 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                          {slide.heading}
                        </h1>
                      )}

                      {slide.subheading && (
                        <p className="mb-7 max-w-xl text-base leading-relaxed text-white/90 md:text-lg">
                          {slide.subheading}
                        </p>
                      )}

                      {slide.ctaUrl && slide.ctaText && (
                        <Link
                          to={slide.ctaUrl}
                          className="inline-flex items-center gap-2 rounded-full bg-pink-200 px-6 py-3 text-sm font-semibold !text-black transition-all duration-300 hover:gap-3 hover:bg-white/90"
                        >
                          {slide.ctaText}
                          <ArrowRight size={16} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </section>

      {categories?.length > 0 && <section className="container section-spacing">
        <div className="section-head">
          <span className="eyebrow">Shop by scent</span>
          <h2>Explore our collections</h2>
        </div>
        <div className="category-grid">
          {categories.length === 0 ? (
            <div className="empty-state full-width">
              No categories have been published yet.
            </div>
          ) : (
            categories.map((category) => (
              <Link
                key={category._id}
                to={`/category/${category.slug}`}
                className="category-card"
              >
                <img src={category.image} alt={category.name} />
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.count} products</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>}

      <section className="container section-spacing">
        <div className="section-head">
          <span className="eyebrow">Best sellers</span>
          <h2>Made to be gifted and kept</h2>
        </div>
        <div className="product-grid">
          {products.length === 0 ? (
            <div className="empty-state full-width">
              No products are available yet. The catalog will appear here once
              the admin publishes inventory.
            </div>
          ) : (
            products?.map((product) => {
              const isLiked = wishlist.includes(product._id);
              return (
                <article
                  key={product._id}
                  className="product-card"
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/product/${product.slug}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/product/${product.slug}`);
                    }
                  }}
                >
                  <div className="product-media">
                    <img src={product?.thumbnailImage} alt={product.name} />
                    {product?.badge && (
                      <span className="product-badge">{product.badge}</span>
                    )}
                    <button
                      type="button"
                      className={`wishlist-button ${isLiked ? "active" : ""}`}
                      aria-label={
                        isLiked
                          ? `Remove ${product.name} from wishlist`
                          : `Add ${product.name} to wishlist`
                      }
                      aria-pressed={isLiked}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleWishlist(product._id);
                        triggerToast(
                          isLiked
                            ? "Removed from wishlist"
                            : "Added to wishlist",
                        );
                      }}
                    >
                      <span aria-hidden="true">♥</span>
                      <span className="wishlist-state">
                        {isLiked ? "Saved" : "Save"}
                      </span>
                    </button>
                  </div>
                  <div className="product-body">
                    <div className="product-meta px-2">
                      <span>{product.collection}</span>
                      <span>{product.fragrance}</span>
                    </div>
                    <h3 className='px-2'>{product.name}</h3>
                    <div className="price-row px-2">
                      <strong>₹{product.price}</strong>
                      <span>₹{product.mrp}</span>
                    </div>
                    <div className="card-actions">
                      <button
                        type="button"
                        className="primary-button small"
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(
                            product?._id,
                            1,
                            product.variants?.[0]?._id,
                          );
                          triggerToast("Added to cart");
                        }}
                      >
                        Add to cart
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="container section-spacing">
        <div className="section-head">
          <span className="eyebrow">Brand promise</span>
          <h2>Crafted with warm rituals in mind</h2>
        </div>
        <div className="commitment-grid">
          {[
            "100% Soy Wax",
            "Cruelty Free",
            "Vegan",
            "Clean Fragrance",
            "Sustainable Packaging",
            "Made in India",
          ].map((item) => (
            <div key={item} className="commitment-item">
              <Sparkles size={18} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
