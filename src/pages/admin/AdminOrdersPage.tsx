export const AdminOrdersPage = () => {
  return (
    <div>
      <h2>Orders</h2>
      <div className="admin-table">
        <div className="table-row head">
          <span>Order</span>
          <span>Customer</span>
          <span>Total</span>
          <span>Status</span>
        </div>
        <div className="table-row">
          <span>#CA-2048</span>
          <span>Rahul Sharma</span>
          <span>₹2,899</span>
          <span>Paid</span>
        </div>
      </div>
    </div>
  )
}
