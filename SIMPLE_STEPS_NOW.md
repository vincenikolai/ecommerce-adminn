# DO THIS RIGHT NOW - EXACT STEPS

## Your console is ready. Now you need to SUBMIT THE FORM.

---

## 1️⃣ Change Console Filter

In the filter box where it says `'STARTING QUANTITY'`, change it to:

```
API Route
```

(or just clear the filter by clicking the X)

---

## 2️⃣ Go to Your App in Browser

Make sure you're on the **Receiving Report** page

---

## 3️⃣ Click "Create Receiving Report" Button

This should open a modal/form

---

## 4️⃣ Fill Out the Form:

- **Purchase Order**: Select **"100"** from dropdown
- **Received Date**: Pick any date
- **Warehouse Location**: Type "Warehouse A"
- **Materials Section**:
  - Material: Select **"Surfactants"**
  - Quantity: Type **10**
- **Notes**: (leave blank or type anything)

---

## 5️⃣ Click "SUBMIT" or "CREATE" Button

**THIS IS THE MOMENT THE LOGS WILL APPEAR!**

---

## 6️⃣ Watch the Console

You should immediately see:

```
API Route - ======= STARTING QUANTITY SUBTRACTION =======
API Route - Purchase order materials: [...]
API Route - Items to process: [...]
... many more logs ...
API Route - ======= FINISHED QUANTITY SUBTRACTION =======
```

---

## ❌ If You See NOTHING:

### Check for:
1. **Red error messages** in console
2. **Network tab** - click "Network" tab, look for a POST request to `/api/admin/receiving-reports/create`
3. **Did the form submit?** - Did you see a success/error message?

---

## 📸 If Still Nothing:

Take screenshots of:
1. The form you're filling out
2. The console after clicking Submit
3. The Network tab showing the API call

