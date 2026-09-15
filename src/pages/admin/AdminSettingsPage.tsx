export const AdminSettingsPage = () => {
  return (
    <div>
      <h2>Settings</h2>
      <div className="admin-panel">
        <div className="field-group">
          <label>Store name</label>
          <input defaultValue="Candley Aroma" />
        </div>
        <div className="field-group">
          <label>Support email</label>
          <input defaultValue="hello@candleyaroma.com" />
        </div>
        <button className="primary-button" type="button">Save changes</button>
      </div>
    </div>
  )
}
