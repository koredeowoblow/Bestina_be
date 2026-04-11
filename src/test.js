const BASE = 'https://bestina-be.onrender.com/api'

async function run() {
    const login = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@example.com', password: 'Password123!' })
    })
    const { data } = await login.json()
    const TOKEN = data.token
    const h = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

    // === CART TESTS ===
    const t1 = await fetch(`${BASE}/cart/add`, { method: 'POST', headers: h, body: JSON.stringify({ productId: '69cb94ba91f04f118ff0f55f', quantity: -1 }) })
    console.log('Negative qty:', await t1.json())

    const t2 = await fetch(`${BASE}/cart/add`, { method: 'POST', headers: h, body: JSON.stringify({ productId: '69cb94ba91f04f118ff0f55f', quantity: 0 }) })
    console.log('Zero qty:', await t2.json())

    const t3 = await fetch(`${BASE}/cart/add`, { method: 'POST', headers: h, body: JSON.stringify({ productId: '69cb94ba91f04f118ff0f55f', quantity: 99999 }) })
    console.log('Massive qty:', await t3.json())

    const t4 = await fetch(`${BASE}/cart/add`, { method: 'POST', headers: h, body: JSON.stringify({ productId: '69cb94ba91f04f118ff0f55f', quantity: 1 }) })
    console.log('Out of stock (stock=0):', await t4.json())

    const t5 = await fetch(`${BASE}/cart/update`, { method: 'PUT', headers: h, body: JSON.stringify({ productId: '69cb94ba91f04f118ff0f55f', quantity: -1 }) })
    console.log('Update negative:', await t5.json())

    // === ORDER TESTS ===
    // Public track with no body
    const t6 = await fetch(`${BASE}/orders/track`, { method: 'POST', headers: h, body: JSON.stringify({}) })
    console.log('Track empty:', await t6.json())

    // Get my orders
    const t7 = await fetch(`${BASE}/orders/me`, { headers: h })
    console.log('My orders:', await t7.json())

    // Create order with empty body
    const t8 = await fetch(`${BASE}/orders`, { method: 'POST', headers: h, body: JSON.stringify({}) })
    console.log('Create order empty:', await t8.json())

    // Access another user order by guessing ID
    const t9 = await fetch(`${BASE}/orders/69cb94b891f04f118ff0f477`, { headers: h })
    console.log('IDOR order:', await t9.json())

    // Cancel order you dont own
    const t10 = await fetch(`${BASE}/orders/69cb94b891f04f118ff0f477/cancel`, { method: 'POST', headers: h })
    console.log('Cancel other order:', await t10.json())

    // === CHECKOUT TESTS ===
    // Empty quote
    const t11 = await fetch(`${BASE}/checkout/quote`, { method: 'POST', headers: h, body: JSON.stringify({}) })
    console.log('Checkout quote empty:', await t11.json())

    // Quote with negative price manipulation
    const t12 = await fetch(`${BASE}/checkout/quote`, { method: 'POST', headers: h, body: JSON.stringify({ items: [{ productId: '69cb94ba91f04f118ff0f55f', quantity: 1, price: -1 }] }) })
    console.log('Checkout price tamper:', await t12.json())
}

run()