import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { triggerToast } from "../../components/common/ToastContainer";
import { api, type AdminProductInput } from "../../services/api";

const initialProduct: AdminProductInput = {
  name: "",
  slug: "",
  sku: "",
  category: "",
  collection: "",
  fragrance: "",
  description: "",
  shortDescription: "",
  price: 0,
  mrp: 0,
  stock: 0,
  tags: [],
  status: "DRAFT",
  featured: false,
  variants: [],
};

export const AdminProductsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams(location.search);
  const editProductId = searchParams.get("edit");

  const isCreateRoute = location.pathname.endsWith("/new");
  const isEditMode = Boolean(editProductId);

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => api.adminProducts({ limit: 100 }),
    retry: false,
  });

  const [product, setProduct] = useState(initialProduct);

  // Newly selected files
  const [images, setImages] = useState<File[]>([]);

  // Thumbnail index for combined existing + newly added images
  const [thumbnailIndex, setThumbnailIndex] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Images already stored in database
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const update = (key: keyof AdminProductInput, value: string | number) => {
    setProduct((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const chooseImages = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);

    setImages((previousImages) => {
      // Existing DB images + newly selected images
      const remainingSlots = 12 - existingImages.length - previousImages.length;

      if (remainingSlots <= 0) {
        setError("You can upload maximum 12 images.");
        return previousImages;
      }

      const filesToAdd = newFiles.slice(0, remainingSlots);

      if (newFiles.length > remainingSlots) {
        setError("Only 12 product images are allowed.");
      } else {
        setError("");
      }

      return [...previousImages, ...filesToAdd];
    });
  };
  console.log(isEditMode, "this is isEditMode");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setIsSaving(true);

    try {
      if (isEditMode && editProductId) {
        await api.updateAdminProduct(
          editProductId,
          product,
          images,
          thumbnailIndex,
        );

        triggerToast("Product updated");
      } else {
        await api.createAdminProduct(product, images, thumbnailIndex);

        triggerToast("Product created");
      }

      await queryClient.invalidateQueries({
        queryKey: ["admin-products"],
      });

      navigate("/admin/products");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : isEditMode
            ? "Unable to update product"
            : "Unable to create product",
      );
    } finally {
      setIsSaving(false);
      setProduct(initialProduct);
      setExistingImages([]);
      setThumbnailIndex(0);
      setImages([]);
      setError("");
    }
  };

  const products = productsQuery.data?.items ?? [];

  const removeExistingImage = (index: number) => {
    setExistingImages((previousImages) =>
      previousImages.filter((_, imageIndex) => imageIndex !== index),
    );

    // Keep thumbnail index valid
    setThumbnailIndex((previousIndex) => {
      if (index === previousIndex) return 0;
      if (index < previousIndex) return previousIndex - 1;
      return previousIndex;
    });
  };

  const removeNewImage = (index: number) => {
    setImages((previousImages) =>
      previousImages.filter((_, imageIndex) => imageIndex !== index),
    );

    // New images come after existing images
    const removedImageIndex = existingImages.length + index;

    setThumbnailIndex((previousIndex) => {
      if (removedImageIndex === previousIndex) return 0;
      if (removedImageIndex < previousIndex) return previousIndex - 1;
      return previousIndex;
    });
  };

  useEffect(() => {
    if (!isEditMode) {
      setProduct(initialProduct);
      setExistingImages([]);
      setThumbnailIndex(0);
      setImages([]);
      setError("");
      return;
    }

    if (!editProductId || !productsQuery.data?.items) return;

    const existingProduct = productsQuery.data.items.find(
      (item) => item._id === editProductId,
    );

    if (!existingProduct) {
      setError("Product not found.");
      return;
    }

    setProduct({
      name: existingProduct.name,
      slug: existingProduct.slug,
      sku: existingProduct.sku,
      category: existingProduct.category,
      collection: existingProduct.collection,
      fragrance: existingProduct.fragrance,
      description: existingProduct.description,
      shortDescription: existingProduct.shortDescription,
      price: existingProduct.price,
      mrp: existingProduct.mrp,
      stock: existingProduct.stock,
      tags: existingProduct.tags ?? [],
      status: existingProduct.status,
      featured: existingProduct.featured ?? false,
      variants: existingProduct.variants ?? [],
    });

    setExistingImages(existingProduct.images ?? []);

    setThumbnailIndex(0);
    setImages([]);

    setError("");
  }, [editProductId, productsQuery.data, isEditMode]);

  const newImagePreviewUrls = images.map((image) => URL.createObjectURL(image));

  useEffect(() => {
    return () => {
      newImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  return (
    <section>
      <div className="account-heading">
        <div>
          <span className="eyebrow">Catalog</span>
          <h2>Products</h2>
        </div>

        <Link to="/admin/products/new" className="primary-button">
          <Plus size={16} />
          Add product
        </Link>
      </div>

      {productsQuery.isLoading && (
        <div className="account-empty-state">
          <p>Loading products...</p>
        </div>
      )}

      {productsQuery.isError && (
        <div className="account-empty-state">
          <h2>Unable to load products</h2>

          <p>
            {productsQuery.error instanceof Error
              ? productsQuery.error.message
              : "Please try again later."}
          </p>
        </div>
      )}

      {!productsQuery.isLoading &&
        !productsQuery.isError &&
        products.length === 0 && (
          <div className="account-empty-state">
            <h2>No products yet</h2>

            <p>Add your first product to start building the catalog.</p>
          </div>
        )}

      {products.length > 0 && (
        <div className="product-grid wide admin-product-grid">
          {products.map((item) => (
            <article
              key={item._id}
              className="product-card w-1/5 flex flex-col"
            >
              <div className="product-media w-full">
                <img
                  src={item?.thumbnailImage}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="product-body w-full">
                <div className="product-meta px-2">
                  <span>{item.category}</span>
                  <span>{item.stock} in stock</span>
                </div>

                <h3 className="px-2">{item.name}</h3>

                <div className="price-row px-2">
                  <strong>₹{item.price}</strong>
                  <span>₹{item.mrp}</span>
                </div>

                <div className="px-2 pb-3 pt-2">
                  <Link
                    to={`/admin/products/new?edit=${item._id}`}
                    className="primary-button w-full justify-center"
                  >
                    Edit product
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {isCreateRoute && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onClick={() => navigate("/admin/products")}
        >
          <aside
            className="admin-product-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span className="eyebrow">Catalog</span>

                <h2 id="add-product-title">
                  {isEditMode ? "Edit product" : "Add product"}
                </h2>
              </div>

              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  navigate("/admin/products");
                  setProduct(initialProduct);
                  setExistingImages([]);
                  setThumbnailIndex(0);
                  setImages([]);
                  setError("");
                }}
                aria-label={
                  isEditMode
                    ? "Close edit product drawer"
                    : "Close add product drawer"
                }
              >
                <X size={20} />
              </button>
            </div>

            <form className="admin-panel admin-product-form" onSubmit={submit}>
              <div className="field-grid">
                <label>
                  Name
                  <input
                    required
                    value={product.name}
                    onChange={(event) => update("name", event.target.value)}
                  />
                </label>

                <label>
                  Slug
                  <input
                    required
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    value={product.slug}
                    onChange={(event) => update("slug", event.target.value)}
                  />
                </label>

                <label>
                  SKU
                  <input
                    required
                    value={product.sku}
                    onChange={(event) => update("sku", event.target.value)}
                  />
                </label>

                <label>
                  Category
                  <input
                    required
                    value={product.category}
                    onChange={(event) => update("category", event.target.value)}
                  />
                </label>

                <label>
                  Collection
                  <input
                    required
                    value={product.collection}
                    onChange={(event) =>
                      update("collection", event.target.value)
                    }
                  />
                </label>

                <label>
                  Fragrance
                  <input
                    required
                    value={product.fragrance}
                    onChange={(event) =>
                      update("fragrance", event.target.value)
                    }
                  />
                </label>

                <label>
                  Price
                  <input
                    required
                    min="0"
                    type="number"
                    value={product.price}
                    onChange={(event) =>
                      update("price", Number(event.target.value))
                    }
                  />
                </label>

                <label>
                  MRP
                  <input
                    required
                    min="0"
                    type="number"
                    value={product.mrp}
                    onChange={(event) =>
                      update("mrp", Number(event.target.value))
                    }
                  />
                </label>

                <label>
                  Quantity
                  <input
                    required
                    min="0"
                    type="number"
                    value={product.stock}
                    onChange={(event) =>
                      update("stock", Number(event.target.value))
                    }
                  />
                </label>

                <label>
                  Status
                  <select
                    value={product.status}
                    onChange={(event) => update("status", event.target.value)}
                  >
                    <option value="DRAFT">Draft</option>

                    <option value="ACTIVE">Active</option>
                  </select>
                </label>
              </div>

              <label>
                Short description
                <input
                  required
                  value={product.shortDescription}
                  onChange={(event) =>
                    update("shortDescription", event.target.value)
                  }
                />
              </label>

              <label>
                Description
                <textarea
                  required
                  rows={5}
                  value={product.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                />
              </label>

              {/* ================================
                  PRODUCT IMAGE UPLOAD
              ================================= */}
              <div className="product-image-upload-section">
                <label>
                  Product images
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    disabled={existingImages.length + images.length >= 12}
                    onChange={(event) => {
                      chooseImages(event.target.files);

                      // Allows selecting the same
                      // file again later.
                      event.target.value = "";
                    }}
                  />
                </label>

                <p className="image-upload-info text-xs text-red-300">
                  First image will be used as the main thumbnail. You can upload
                  up to 12 images.
                </p>
                {(existingImages.length > 0 || images.length > 0) && (
                  <div className="admin-image-picker mb-4">
                    {/* Existing database images */}
                    {existingImages.map((image, index) => (
                      <div
                        className={`admin-image-item ${
                          index === thumbnailIndex ? "selected" : ""
                        }`}
                        key={`existing-${image}-${index}`}
                      >
                        <div key={image} className="relative">
                          <img
                            src={image}
                            alt={`Product ${index + 1}`}
                            className="h-32 w-32 rounded-lg object-cover"
                          />

                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="image-item-footer">
                          <span>
                            {index === thumbnailIndex
                              ? "Main thumbnail"
                              : `Product image ${index + 1}`}
                          </span>

                          <button
                            type="button"
                            onClick={() => setThumbnailIndex(index)}
                          >
                            {index === thumbnailIndex
                              ? "Selected"
                              : "Make thumbnail"}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Newly selected images */}
                    {images.map((image, index) => {
                      const imageIndex = existingImages.length + index;

                      const previewUrl = newImagePreviewUrls[index];

                      return (
                        <div
                          className={`admin-image-item ${
                            imageIndex === thumbnailIndex ? "selected" : ""
                          }`}
                          key={`new-${image.name}-${image.lastModified}-${index}`}
                        >
                          <div className="relative">
                            <img
                              src={previewUrl}
                              alt={`Product ${index + 1}`}
                              className="h-32 w-32 rounded-lg object-cover"
                            />

                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-red-600"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="image-item-footer">
                            <span>
                              {imageIndex === thumbnailIndex
                                ? "Main thumbnail"
                                : `New image ${index + 1}`}
                            </span>

                            <button
                              type="button"
                              onClick={() => setThumbnailIndex(imageIndex)}
                            >
                              {imageIndex === thumbnailIndex
                                ? "Selected"
                                : "Make thumbnail"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Image count */}
                {existingImages.length + images.length < 12 && (
                  <p className="image-count text-sm italic text-gray-400">
                    {existingImages.length + images.length}
                    /12 images selected
                  </p>
                )}

                {existingImages.length + images.length >= 12 && (
                  <p className="image-count text-sm italic text-gray-400">
                    12/12 images selected
                  </p>
                )}
              </div>

              {error && <p className="form-error">{error}</p>}

              <button
                className="primary-button"
                type="submit"
                disabled={isSaving}
              >
                {isSaving
                  ? isEditMode
                    ? "Updating product..."
                    : "Uploading and saving..."
                  : isEditMode
                    ? "Update product"
                    : "Create product"}
              </button>
            </form>
          </aside>
        </div>
      )}
    </section>
  );
};
