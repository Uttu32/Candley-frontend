export const AdminCustomersPage = () => {
  return (
    <div>
      <h2>Customers</h2>
      <div className="admin-table">
        <div className="table-row head">
          <span>Name</span>
          <span>Email</span>
          <span>Orders</span>
          <span>Status</span>
        </div>
        <div className="table-row">
          <span>Priya Mehta</span>
          <span>priya@example.com</span>
          <span>6</span>
          <span>Active</span>
        </div>
      </div>
    </div>
  )
}
