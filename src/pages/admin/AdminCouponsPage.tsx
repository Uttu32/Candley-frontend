export const AdminCouponsPage = () => {
  return (
    <div>
      <h2>Coupons</h2>
      <div className="admin-table">
        <div className="table-row head">
          <span>Code</span>
          <span>Discount</span>
          <span>Usage</span>
          <span>Status</span>
        </div>
        <div className="table-row">
          <span>WELCOME10</span>
          <span>10%</span>
          <span>182</span>
          <span>Active</span>
        </div>
      </div>
    </div>
  )
}
