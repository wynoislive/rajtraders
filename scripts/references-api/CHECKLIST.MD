
1. Customer account
 Account deletion
 Profile editing
 Mobile number/email editing
 Multiple devices
 Multiple browser tabs
 Logout on another device handled correctly



2. Location / delivery address

This is one of the most important parts

Detect current location
 Location permission denied
 Location permission granted
 Manual address search
 Google Maps/Mapbox/etc. integration
 Pin location
 House/flat number
 Building/society
 Landmark
 Delivery instructions
 Saved addresses
 Edit address
 Delete address
 Default address
 Switch address
 Unsupported delivery zone
 Serviceable area validation
 Out-of-stock/serviceability changes after address change


3. 

 Open/closed state
Minimum order
Delivery fee
Store distance
 Store temporarily unavailable
Delivery ETA
Categories


4. Search

Product search
Category search

Partial search
 Spelling mistakes
 Case variations
 Numbers
 Unicode
 Hindi/regional-language text

Empty search
 No results
 Search suggestions
 Recent searches
 Clear search
 Search filters
 Sorting
 Pagination/infinite scroll


5. Product listing - The browser can display them, but the backend must calculate the authoritative order amount.

Every product card should be tested.

 Product image
 Product name
 Price
 MRP
 Discount
 Quantity/unit
 Variant
 Stock state
 Add button
 Quantity selector
 Out-of-stock state
 Product unavailable
 Product removed
 Product price changed




📦 6. Product detail
 Images
 Product description
 Price
 MRP
 Discount
 Variants
 Quantity
 Stock
 Nutritional information where applicable
 Ingredients where applicable
 Manufacturer information where applicable
 Related products
 Reviews if supported
 Add to cart
 Product unavailable handling

🛒 7. Cart

This is a critical production area.

Test:

 Add product
 Remove product
 Increase quantity
 Decrease quantity
 Empty cart
 Cart persists after refresh
 Cart persists after login
 Guest → login cart merge
 Multiple products
 Multiple variants
 Product becomes unavailable
 Product price changes
 Quantity limit
 Address changes
 Minimum order
 Delivery fee changes

Cart calculation

Product total
+
Packaging fee
+
Delivery fee
+
Taxes
-
Discount
-
Coupon
=
Final total


rounding:

₹9.99
₹99.50
₹0.01

🎟️ 8. Coupons / offers
 Valid coupon
 Invalid coupon
 Expired coupon
 Minimum-order coupon
 Product-specific coupon
 First-order coupon
 Usage limit
 Already-used coupon
 Remove coupon
 Coupon changes final amount
 Coupon becomes invalid during checkout

Backend must reject manipulated values.


💰 9. Checkout

This is another P0 area.

 Address
 Delivery instructions
 Order summary
 Items
 Quantities
 Price
 Discounts
 Fees
 Tax
 Final total
 Estimated delivery
 Payment method
 Place order

Before placing the order, verify:

Current product price
Current inventory
Current store status
Current delivery serviceability
Current coupon eligibility
Current final amount

The client must not be authoritative for any of these.


📦 11. Order placement

After payment/order submission:

 Order created exactly once
 No duplicate order
 Order ID shown
 Correct items
 Correct quantities
 Correct amount
 Correct address
 Correct delivery fee
 Correct discount
 Correct payment state
 Correct ETA

📜 13. Order history
 Current orders
 Previous orders
 Order details
 Reorder
 Invoice
 Payment status
 Refund status
 Cancel order where applicable
 Support/contact option

❤️ 15. Favorites / wishlist

If supported:

 Add favorite
 Remove favorite
 Persist after refresh
 Persist across devices
 Deleted product handling

🔔 16. Notifications
 Order confirmation
 Order status
 Delivery updates
 Promotional notifications if applicable
 Notification preferences
 Unsubscribe/disable handling
 Clicking notification opens correct order/page

🔐 19. Customer-side security

Public panel should be tested for:

 XSS
 CSRF where applicable
 Session fixation
 Token leakage
 Sensitive data in localStorage
 Sensitive data in URLs
 Open redirects
 Clickjacking
 Unsafe HTML
 Unsafe file handling
 Dependency vulnerabilities
 Exposed environment variables

And especially:

Change order ID
Change product ID
Change user ID
Change address ID
Change coupon ID
Change store ID

🧠 20. State consistency

This is one of the biggest differences between a normal website and a Blinkit/Swiggy-style system.

Imagine:

User opens product
      ↓
₹100
      ↓
adds to cart
      ↓
Admin changes price to ₹120
      ↓
User checks out

Your frontend cannot simply keep using ₹100.

Similarly:

Product available
      ↓
User adds to cart
      ↓
Last unit sold
      ↓
User checks out

Your UI needs to gracefully handle the backend rejecting the stale cart.

⚡ 21. Performance

For a shopping platform:

 Fast home page
 Fast category navigation
 Fast search
 Fast product listing
 Images optimized
 Lazy loading
 Skeleton loaders
 Prefetch where useful
 Avoid giant JS bundle
 Avoid unnecessary rerenders
 API caching where appropriate
 CDN for static assets
 Proper cache invalidation

Don't cache user-specific or rapidly changing inventory/pricing data incorrectly.