import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { products as fallbackProducts } from "../data/mock";
import { useQuery } from "@tanstack/react-query";
import { triggerToast } from "../components/common/ToastContainer";
import { useAppStore } from "../store/useAppStore";
import {
  defaultPreferences,
  getStoredPreferences,
  getStoredProfile,
  savePreferences,
  saveProfile,
  fetchRemoteProfile,
} from "../services/account";
import type { AccountPreferences, AccountProfile } from "../services/account";
import { api, clearAccessToken, getAccessToken } from "../services/api";

const accountNav = [
  { path: "/account", label: "Profile" },
  { path: "/account/orders", label: "Orders" },
  { path: "/account/wishlist", label: "Wishlist" },
  { path: "/account/settings", label: "Settings" },
];

export const AccountPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, wishlist } = useAppStore();
  const wishlistQuery = useQuery({
    queryKey: ["wishlist"],
    queryFn: api.wishlist,
    enabled: Boolean(getAccessToken()),
    retry: false,
  });
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders,
    enabled: Boolean(getAccessToken()),
    retry: false,
  });
  const productsQuery = useQuery({
    queryKey: ["products", "account"],
    queryFn: () => api.products(new URLSearchParams({ limit: "100" })),
    retry: false,
  });

  const wishlistProductIds =
    wishlist.length > 0
      ? wishlist
      : (wishlistQuery.data?.productIds ?? [])
          .map((product) =>
            typeof product === "string" ? product : product?._id,
          )
          .filter((id): id is string => Boolean(id));

  const catalogProducts = productsQuery.data?.items ?? fallbackProducts;
  const savedProducts = catalogProducts.filter((product) =>
    wishlistProductIds.includes(product._id),
  );
  const isWishlistPage = location.pathname === "/account/wishlist";
  const isOrdersPage = location.pathname === "/account/orders";
  const isSettingsPage = location.pathname === "/account/settings";
  const [profile, setProfile] = useState<AccountProfile>(() =>
    getStoredProfile(),
  );
  const [preferences, setPreferences] = useState<AccountPreferences>(() =>
    getStoredPreferences(),
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) return;
    fetchRemoteProfile(accessToken)
      .then((remoteProfile) => {
        if (remoteProfile) {
          setProfile((current) => ({ ...current, ...remoteProfile }));
          saveProfile({ ...getStoredProfile(), ...remoteProfile });
        }
      })
      .catch(() => undefined);
  }, []);

  const saveProfileChanges = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const updatedProfile = getAccessToken()
        ? await api.updateProfile(profile)
        : profile;
      const localProfile = { ...profile, ...updatedProfile };
      setProfile(localProfile);
      saveProfile(localProfile);
      setIsEditing(false);
      triggerToast("Profile updated");
    } catch (submissionError) {
      triggerToast(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to update profile",
      );
    }
  };

  const updatePreference = (key: keyof AccountPreferences) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    savePreferences(next);
    triggerToast("Settings updated");
  };

  const signOut = () => {
    void api.logout().catch(() => undefined);
    clearAccessToken();
    navigate("/login");
    triggerToast("You have been signed out");
  };
  console.log(ordersQuery.data, "this is ordersQuery data");

  return (
    <div className="container section-spacing">
      <div className="account-heading">
        <div>
          <span className="eyebrow">Your space</span>
          <h1>
            {isWishlistPage
              ? "Your wishlist"
              : isOrdersPage
                ? "Your orders"
                : isSettingsPage
                  ? "Settings"
                  : "Account"}
          </h1>
        </div>
        <button
          type="button"
          className="secondary-button small"
          onClick={signOut}
        >
          Sign out
        </button>
      </div>
      <div className="account-layout">
        <nav className="account-sidebar card-surface">
          {accountNav.map((item) => (
            <Link
              key={item.path}
              className={location.pathname === item.path ? "active" : ""}
              to={item.path}
            >
              {item.label}
              {item.path === "/account/wishlist" && wishlist.length > 0
                ? ` (${wishlist.length})`
                : ""}
            </Link>
          ))}
        </nav>
        <div className="account-content card-surface">
          {isSettingsPage ? (
            <div className="account-section">
              <span className="eyebrow">Preferences</span>
              <h2>Make Candley feel like yours</h2>
              <p className="account-muted">
                Choose the updates that are useful to you. Changes are saved
                automatically.
              </p>
              <div className="preference-list">
                {(
                  [
                    [
                      "orderUpdates",
                      "Order updates",
                      "Delivery, payment and cancellation notifications.",
                    ],
                    [
                      "promotions",
                      "Offers and new launches",
                      "Occasional notes about collections and seasonal gifting.",
                    ],
                    [
                      "priceDrops",
                      "Price drop alerts",
                      "A note when something saved becomes more affordable.",
                    ],
                    [
                      "backInStock",
                      "Back-in-stock alerts",
                      "Know when a favourite candle returns.",
                    ],
                  ] as [keyof AccountPreferences, string, string][]
                ).map(([key, label, description]) => (
                  <label key={key} className="preference-row">
                    <span>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={preferences[key]}
                      onChange={() => updatePreference(key)}
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setPreferences(defaultPreferences);
                  savePreferences(defaultPreferences);
                  triggerToast("Settings reset");
                }}
              >
                Reset preferences
              </button>
            </div>
          ) : isOrdersPage ? (
            ordersQuery.isLoading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <span className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Order history
                </span>
                <h2 className="text-xl font-semibold text-neutral-900">
                  Loading your orders...
                </h2>
                <p className="mt-2 text-sm text-neutral-500">
                  Please wait while we fetch your latest purchases.
                </p>
              </div>
            ) : ordersQuery.isError ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <span className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Order history
                </span>
                <h2 className="text-xl font-semibold text-neutral-900">
                  Unable to load orders
                </h2>
                <p className="mt-2 text-sm text-neutral-500">
                  Please try again in a moment.
                </p>
              </div>
            ) : ordersQuery.data && ordersQuery.data.length > 0 ? (
              <div className="flex flex-col gap-6">
                {ordersQuery.data.map((order) => (
                  <article
                    key={order._id}
                    className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
                  >
                    {/* Order Header */}
                    <div className="flex flex-col gap-4 border-b border-neutral-100 bg-neutral-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                          Order #{order.orderNumber}
                        </span>

                        <span className="text-sm text-neutral-500">
                          Ordered on{" "}
                          {new Date(order.createdAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                            order.status === "CONFIRMED"
                              ? "bg-emerald-50 text-emerald-700"
                              : order.status === "PROCESSING"
                                ? "bg-blue-50 text-blue-700"
                                : order.status === "SHIPPED"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : order.status === "DELIVERED"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : order.status === "CANCELLED"
                                      ? "bg-red-50 text-red-700"
                                      : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {order.status.replaceAll("_", " ")}
                        </span>

                        <strong className="text-base font-semibold text-neutral-900">
                          ₹{order.total.toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>

                    {/* Ordered Products */}
                    <div className="px-5 sm:px-6">
                      {order.items.map((item) => (
                        <div
                          key={item.productId}
                          className="flex gap-4 border-b border-neutral-100 py-5 last:border-b-0"
                        >
                          {/* Product Image */}
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:h-24 sm:w-24">
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          {/* Product Details */}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold text-neutral-900 sm:text-base">
                              {item.productName}
                            </h3>

                            <p className="mt-1 text-xs text-neutral-500">
                              SKU: {item.sku}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                              <span>Qty: {item.quantity}</span>

                              <span>
                                ₹{item.unitPrice.toLocaleString("en-IN")} each
                              </span>
                            </div>
                          </div>

                          {/* Item Total */}
                          <div className="shrink-0 text-right">
                            <span className="hidden text-xs text-neutral-400 sm:block">
                              Item total
                            </span>

                            <strong className="mt-1 block text-sm font-semibold text-neutral-900 sm:text-base">
                              ₹{item.lineTotal.toLocaleString("en-IN")}
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Summary */}
                    <div className="border-t border-neutral-100 bg-neutral-50/60 px-5 py-5 sm:px-6">
                      <div className="ml-auto w-full space-y-2 sm:max-w-sm">
                        <div className="flex items-center justify-between text-sm text-neutral-500">
                          <span>Subtotal</span>
                          <strong className="font-medium text-neutral-800">
                            ₹{order.subtotal.toLocaleString("en-IN")}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between text-sm text-neutral-500">
                          <span>Shipping</span>
                          <strong className="font-medium text-neutral-800">
                            {order.shipping === 0
                              ? "Free"
                              : `₹${order.shipping.toLocaleString("en-IN")}`}
                          </strong>
                        </div>

                        {order.tax > 0 && (
                          <div className="flex items-center justify-between text-sm text-neutral-500">
                            <span>Tax</span>
                            <strong className="font-medium text-neutral-800">
                              ₹{order.tax.toLocaleString("en-IN")}
                            </strong>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3">
                          <span className="text-base font-semibold text-neutral-900">
                            Total
                          </span>

                          <strong className="text-lg font-bold text-neutral-900">
                            ₹{order.total.toLocaleString("en-IN")}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Payment + Invoice */}
                    <div className="flex flex-col gap-4 border-t border-neutral-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-500">
                        <span>
                          Payment:{" "}
                          <strong className="font-semibold text-neutral-800">
                            {order.paymentMethod}
                          </strong>
                        </span>

                        <span>
                          Payment status:{" "}
                          <strong
                            className={
                              order.paymentStatus === "PENDING"
                                ? "font-semibold text-amber-600"
                                : order.paymentStatus === "PAID"
                                  ? "font-semibold text-emerald-600"
                                  : order.paymentStatus === "FAILED"
                                    ? "font-semibold text-red-600"
                                    : "font-semibold text-neutral-800"
                            }
                          >
                            {order.paymentStatus.replaceAll("_", " ")}
                          </strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        className="secondary-button small w-full sm:w-auto"
                        onClick={() => {
                          triggerToast(
                            `Invoice for ${order.orderNumber} will be available soon`,
                          );
                        }}
                      >
                        View invoice
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <span className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Order history
                </span>

                <h2 className="text-xl font-semibold text-neutral-900">
                  No orders yet
                </h2>

                <p className="mt-2 max-w-md text-sm text-neutral-500">
                  Your completed purchases will appear here with delivery
                  details and invoices.
                </p>

                <Link to="/shop" className="primary-button mt-6">
                  Explore candles
                </Link>
              </div>
            )
          ) : isWishlistPage ? (
            savedProducts.length === 0 ? (
              <div className="empty-state">
                <h3>Your wishlist is empty</h3>
                <p>Tap the heart on any product to save it here.</p>
                <Link to="/shop" className="primary-button">
                  Explore products
                </Link>
              </div>
            ) : (
              <div className="wishlist-list">
                {savedProducts.map((product) => (
                  <article key={product._id} className="wishlist-row">
                    <img src={product?.thumbnailImage} alt={product.name} />
                    <div className="wishlist-row-copy">
                      <span className="eyebrow">{product.collection}</span>
                      <h3>{product.name}</h3>
                      <strong>₹{product.price}</strong>
                    </div>
                    <div className="wishlist-row-actions">
                      <button
                        type="button"
                        className="primary-button small"
                        onClick={() => {
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
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          toggleWishlist(product?._id);
                          triggerToast("Removed from wishlist");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className="account-section">
              <div className="profile-summary">
                <div className="profile-avatar">
                  {(profile.name || "C").charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="eyebrow">Candle keeper</span>
                  <h2>{profile.name || "Your profile"}</h2>
                  <p>
                    {profile.email ||
                      "Add your email to complete your profile."}
                  </p>
                </div>
              </div>
              {isEditing ? (
                <form className="profile-form" onSubmit={saveProfileChanges}>
                  <label>
                    Full name
                    <input
                      required
                      value={profile.name}
                      onChange={(event) =>
                        setProfile({ ...profile, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(event) =>
                        setProfile({ ...profile, email: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Phone number
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(event) =>
                        setProfile({ ...profile, phone: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Date of birth
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          dateOfBirth: event.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="profile-actions">
                    <button type="submit" className="primary-button">
                      Save changes
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setProfile(getStoredProfile());
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-details">
                  <div>
                    <span>Email</span>
                    <strong>{profile.email || "Not added yet"}</strong>
                  </div>
                  <div>
                    <span>Phone</span>
                    <strong>{profile.phone || "Not added yet"}</strong>
                  </div>
                  <div>
                    <span>Date of birth</span>
                    <strong>{profile.dateOfBirth || "Not added yet"}</strong>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit profile
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
