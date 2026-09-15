import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { products as fallbackProducts } from '../data/mock'
import { useQuery } from '@tanstack/react-query'
import { triggerToast } from '../components/common/ToastContainer'
import { useAppStore } from '../store/useAppStore'
import {
  defaultPreferences,
  getStoredPreferences,
  getStoredProfile,
  savePreferences,
  saveProfile,
  fetchRemoteProfile,
} from '../services/account'
import type { AccountPreferences, AccountProfile } from '../services/account'
import { api, clearAccessToken } from '../services/api'

const accountNav = [
  { path: '/account', label: 'Profile' },
  { path: '/account/orders', label: 'Orders' },
  { path: '/account/wishlist', label: 'Wishlist' },
  { path: '/account/settings', label: 'Settings' },
]

export const AccountPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, wishlist } = useAppStore()
  const wishlistQuery = useQuery({ queryKey: ['wishlist'], queryFn: api.wishlist, enabled: Boolean(window.localStorage.getItem('candley-aroma-access-token')), retry: false })
  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: api.orders, enabled: Boolean(window.localStorage.getItem('candley-aroma-access-token')), retry: false })
  const savedProducts = wishlistQuery.data?.productIds ?? fallbackProducts.filter((product) => wishlist.includes(product.id))
  const isWishlistPage = location.pathname === '/account/wishlist'
  const isOrdersPage = location.pathname === '/account/orders'
  const isSettingsPage = location.pathname === '/account/settings'
  const [profile, setProfile] = useState<AccountProfile>(() => getStoredProfile())
  const [preferences, setPreferences] = useState<AccountPreferences>(() => getStoredPreferences())
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const accessToken = window.localStorage.getItem('candley-aroma-access-token')
    if (!accessToken) return
    fetchRemoteProfile(accessToken).then((remoteProfile) => {
      if (remoteProfile) {
        setProfile((current) => ({ ...current, ...remoteProfile }))
        saveProfile({ ...getStoredProfile(), ...remoteProfile })
      }
    }).catch(() => undefined)
  }, [])

  const saveProfileChanges = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const updatedProfile = window.localStorage.getItem('candley-aroma-access-token') ? await api.updateProfile(profile) : profile
      const localProfile = { ...profile, ...updatedProfile }
      setProfile(localProfile)
      saveProfile(localProfile)
      setIsEditing(false)
      triggerToast('Profile updated')
    } catch (submissionError) {
      triggerToast(submissionError instanceof Error ? submissionError.message : 'Unable to update profile')
    }
  }

  const updatePreference = (key: keyof AccountPreferences) => {
    const next = { ...preferences, [key]: !preferences[key] }
    setPreferences(next)
    savePreferences(next)
    triggerToast('Settings updated')
  }

  const signOut = () => {
    void api.logout().catch(() => undefined)
    clearAccessToken()
    navigate('/login')
    triggerToast('You have been signed out')
  }

  return (
    <div className="container section-spacing">
      <div className="account-heading">
        <div>
          <span className="eyebrow">Your space</span>
          <h1>{isWishlistPage ? 'Your wishlist' : isOrdersPage ? 'Your orders' : isSettingsPage ? 'Settings' : 'Account'}</h1>
        </div>
        <button type="button" className="secondary-button small" onClick={signOut}>Sign out</button>
      </div>
      <div className="account-layout">
        <nav className="account-sidebar card-surface">
          {accountNav.map((item) => (
            <Link key={item.path} className={location.pathname === item.path ? 'active' : ''} to={item.path}>
              {item.label}{item.path === '/account/wishlist' && wishlist.length > 0 ? ` (${wishlist.length})` : ''}
            </Link>
          ))}
        </nav>
        <div className="account-content card-surface">
          {isSettingsPage ? (
            <div className="account-section">
              <span className="eyebrow">Preferences</span>
              <h2>Make Candley feel like yours</h2>
              <p className="account-muted">Choose the updates that are useful to you. Changes are saved automatically.</p>
              <div className="preference-list">
                {([
                  ['orderUpdates', 'Order updates', 'Delivery, payment and cancellation notifications.'],
                  ['promotions', 'Offers and new launches', 'Occasional notes about collections and seasonal gifting.'],
                  ['priceDrops', 'Price drop alerts', 'A note when something saved becomes more affordable.'],
                  ['backInStock', 'Back-in-stock alerts', 'Know when a favourite candle returns.'],
                ] as [keyof AccountPreferences, string, string][]).map(([key, label, description]) => (
                  <label key={key} className="preference-row">
                    <span><strong>{label}</strong><small>{description}</small></span>
                    <input type="checkbox" checked={preferences[key]} onChange={() => updatePreference(key)} />
                  </label>
                ))}
              </div>
              <button type="button" className="text-button" onClick={() => { setPreferences(defaultPreferences); savePreferences(defaultPreferences); triggerToast('Settings reset') }}>Reset preferences</button>
            </div>
          ) : isOrdersPage ? (
            ordersQuery.data && ordersQuery.data.length > 0 ? (
              <div className="order-list">
                {ordersQuery.data.map((order) => (
                  <article className="order-card" key={order._id}>
                    <div><span className="eyebrow">{order.orderNumber}</span><strong>{new Date(order.createdAt).toLocaleDateString()}</strong></div>
                    <span className="order-status">{order.status.replaceAll('_', ' ')}</span>
                    <strong>₹{order.total}</strong>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state account-empty-state">
              <span className="eyebrow">Order history</span>
              <h2>No orders yet</h2>
              <p>Your completed purchases will appear here with delivery details and invoices.</p>
              <Link to="/shop" className="primary-button">Explore candles</Link>
              </div>
            )
          ) : isWishlistPage ? (
            savedProducts.length === 0 ? (
              <div className="empty-state">
                <h3>Your wishlist is empty</h3>
                <p>Tap the heart on any product to save it here.</p>
                <Link to="/shop" className="primary-button">Explore products</Link>
              </div>
            ) : (
              <div className="wishlist-list">
                {savedProducts.map((product) => (
                  <article key={product.id} className="wishlist-row">
                    <img src={product.images[0]} alt={product.name} />
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
                          addToCart(product.id, 1, product.variants?.[0]?.id)
                          triggerToast('Added to cart')
                        }}
                      >
                        Add to cart
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          toggleWishlist(product.id)
                          triggerToast('Removed from wishlist')
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
                <div className="profile-avatar">{(profile.name || 'C').charAt(0).toUpperCase()}</div>
                <div><span className="eyebrow">Candle keeper</span><h2>{profile.name || 'Your profile'}</h2><p>{profile.email || 'Add your email to complete your profile.'}</p></div>
              </div>
              {isEditing ? (
                <form className="profile-form" onSubmit={saveProfileChanges}>
                  <label>Full name<input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
                  <label>Email<input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
                  <label>Phone number<input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
                  <label>Date of birth<input type="date" value={profile.dateOfBirth} onChange={(event) => setProfile({ ...profile, dateOfBirth: event.target.value })} /></label>
                  <div className="profile-actions"><button type="submit" className="primary-button">Save changes</button><button type="button" className="secondary-button" onClick={() => { setProfile(getStoredProfile()); setIsEditing(false) }}>Cancel</button></div>
                </form>
              ) : (
                <div className="profile-details">
                  <div><span>Email</span><strong>{profile.email || 'Not added yet'}</strong></div>
                  <div><span>Phone</span><strong>{profile.phone || 'Not added yet'}</strong></div>
                  <div><span>Date of birth</span><strong>{profile.dateOfBirth || 'Not added yet'}</strong></div>
                  <button type="button" className="primary-button" onClick={() => setIsEditing(true)}>Edit profile</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
