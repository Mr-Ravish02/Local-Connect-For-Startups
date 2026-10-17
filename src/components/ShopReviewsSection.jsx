import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { Star, MessageSquare, Edit3, User, CheckCircle } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

function StarRating({ rating, setRating, readOnly = false, size = '1.2rem' }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const activeStar = readOnly ? rating : (hoverRating || rating);
        const isFilled = star <= activeStar;
        return (
          <span
            key={star}
            onClick={() => !readOnly && setRating && setRating(star)}
            onMouseEnter={() => !readOnly && setHoverRating(star)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
            style={{
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: size,
              color: isFilled ? '#f59e0b' : '#cbd5e1',
              transition: 'transform 0.15s ease, color 0.15s ease',
              transform: !readOnly && hoverRating === star ? 'scale(1.2)' : 'scale(1)',
              userSelect: 'none',
              lineHeight: 1,
            }}
            id={!readOnly ? `star-input-${star}` : undefined}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

function ShopReviewsSection({ shopId, onRatingUpdate }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const { currentUser } = useAuth();

  // Listen to reviews in real-time
  useEffect(() => {
    if (!shopId) return;

    const q = query(
      collection(db, 'reviews'),
      where('shopId', '==', shopId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort newest first
        items.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setReviews(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching reviews:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [shopId]);

  // Compute average rating
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  // Notify parent component of average rating update
  useEffect(() => {
    if (onRatingUpdate) {
      onRatingUpdate({
        average: parseFloat(avgRating),
        count: reviews.length,
      });
    }
  }, [avgRating, reviews.length, onRatingUpdate]);

  async function handleSubmitReview(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!rating || rating < 1 || rating > 5) {
      return setFormError('Please select a star rating from 1 to 5.');
    }
    if (!comment.trim()) {
      return setFormError('Please enter a review comment.');
    }

    setSubmitting(true);
    try {
      const customerId = currentUser ? currentUser.uid : 'guest';
      const customerEmail = currentUser?.email || 'Customer';

      await addDoc(collection(db, 'reviews'), {
        shopId,
        customerId,
        customerEmail,
        rating: Number(rating),
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      });

      setFormSuccess('Thank you! Your review has been posted.');
      setComment('');
      setRating(5);
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      console.error('Error submitting review:', err);
      setFormError('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  return (
    <div className="shop-reviews-wrapper" id="shop-reviews-section">
      <div className="reviews-header-card">
        <div className="reviews-summary">
          <div className="reviews-avg-badge">
            <span className="avg-num">{avgRating > 0 ? avgRating : 'New'}</span>
            <span className="avg-star">★</span>
          </div>
          <div className="reviews-summary-text">
            <h3>Customer Reviews & Ratings</h3>
            <p>
              {reviews.length > 0
                ? `Based on ${reviews.length} customer review${reviews.length > 1 ? 's' : ''}`
                : 'No reviews yet. Be the first to share your experience with this shop.'}
            </p>
          </div>
        </div>
      </div>

      {/* Review Submission Form */}
      <div className="review-form-card" id="write-review-card">
        <h4 className="review-form-title">
          <Edit3 size={18} color="var(--color-primary)" />
          Write a Customer Review
        </h4>

        {formError && <div className="review-alert error">{formError}</div>}
        {formSuccess && <div className="review-alert success">{formSuccess}</div>}

        <form onSubmit={handleSubmitReview}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 600, marginBottom: '0.4rem' }}>
              Your Rating (1 to 5 Stars)
            </label>
            <StarRating rating={rating} setRating={setRating} size="1.75rem" />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="review-comment-input" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 600, marginBottom: '0.4rem' }}>
              Your Feedback & Experience
            </label>
            <textarea
              id="review-comment-input"
              className="form-textarea"
              rows="3"
              placeholder="Tell others about the product quality, pricing, customer service, or shop atmosphere…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !comment.trim()}
            id="submit-review-btn"
          >
            {submitting ? 'Posting Review…' : 'Submit Review'}
          </button>
        </form>
      </div>

      {/* Reviews List */}
      <div className="reviews-list" id="reviews-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 0.5rem' }}></div>
            Loading reviews…
          </div>
        ) : reviews.length === 0 ? (
          <div className="no-reviews-box">
            <MessageSquare size={36} color="var(--color-text-muted)" style={{ marginBottom: '0.5rem' }} />
            <p>No customer reviews written for this shop yet.</p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="review-card-item" id={`review-item-${rev.id}`}>
              <div className="review-card-header">
                <div className="review-user-info">
                  <div className="review-avatar">
                    {(rev.customerEmail || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="review-author">
                      {rev.customerEmail ? rev.customerEmail.split('@')[0] : 'Verified Customer'}
                    </span>
                    <span className="review-date">{formatDate(rev.createdAt)}</span>
                  </div>
                </div>
                <StarRating rating={rev.rating} readOnly size="1.05rem" />
              </div>
              <p className="review-comment-text">{rev.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export { StarRating };
export default ShopReviewsSection;
