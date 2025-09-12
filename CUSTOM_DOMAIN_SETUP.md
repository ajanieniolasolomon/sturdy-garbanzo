# Custom Domain Setup for CCMIS

## 🌐 **Setting Up Your Custom Domain with Firebase Hosting**

### **Step 1: Add Custom Domain in Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com/project/ccmis-f6008/hosting)
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `ccmis.yourdomain.com` or `yourdomain.com`)
4. Click **"Continue"**

### **Step 2: Verify Domain Ownership**

Firebase will provide you with DNS records to add:

#### **Option A: TXT Record (Recommended)**
```
Type: TXT
Name: @ (or your subdomain)
Value: [Firebase provided verification string]
```

#### **Option B: HTML File Upload**
- Download the verification file from Firebase
- Upload it to your domain's root directory
- Ensure it's accessible at `https://yourdomain.com/firebase-verification.html`

### **Step 3: Configure DNS Records**

Add these DNS records to your domain provider:

#### **For Root Domain (yourdomain.com):**
```
Type: A
Name: @
Value: 199.36.158.100

Type: AAAA  
Name: @
Value: 2600:1900:0:0:0:0:0:0
```

#### **For Subdomain (ccmis.yourdomain.com):**
```
Type: CNAME
Name: ccmis
Value: ccmis-f6008.web.app
```

### **Step 4: SSL Certificate**

Firebase automatically provisions SSL certificates:
- **Automatic**: Firebase handles SSL certificate generation
- **Wait Time**: 24-48 hours for certificate provisioning
- **Status**: Check in Firebase Console → Hosting → Custom domains

### **Step 5: Update Firebase Configuration (Optional)**

If you want to update the app's configuration for your domain:

1. **Update firebase.json** (if needed):
```json
{
  "hosting": {
    "public": "frontend/dist",
    "site": "ccmis-f6008",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

2. **Redeploy** (if you made changes):
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

## 🔧 **Domain Provider Specific Instructions**

### **GoDaddy**
1. Login to GoDaddy DNS Management
2. Add A record: `@` → `199.36.158.100`
3. Add AAAA record: `@` → `2600:1900:0:0:0:0:0:0`
4. Add CNAME record: `www` → `ccmis-f6008.web.app`

### **Namecheap**
1. Go to Domain List → Manage → Advanced DNS
2. Add A record: `@` → `199.36.158.100`
3. Add AAAA record: `@` → `2600:1900:0:0:0:0:0:0`
4. Add CNAME record: `www` → `ccmis-f6008.web.app`

### **Cloudflare**
1. Go to DNS → Records
2. Add A record: `@` → `199.36.158.100` (Proxied: OFF)
3. Add AAAA record: `@` → `2600:1900:0:0:0:0:0:0` (Proxied: OFF)
4. Add CNAME record: `www` → `ccmis-f6008.web.app` (Proxied: OFF)

## ✅ **Verification Steps**

1. **DNS Propagation**: Wait 24-48 hours for DNS changes
2. **Check Status**: Firebase Console → Hosting → Custom domains
3. **Test Access**: Visit your custom domain
4. **SSL Check**: Ensure HTTPS is working

## 🚨 **Troubleshooting**

### **Domain Not Working?**
- Check DNS propagation: [whatsmydns.net](https://www.whatsmydns.net/)
- Verify DNS records are correct
- Wait up to 48 hours for full propagation

### **SSL Certificate Issues?**
- Ensure domain verification is complete
- Check Firebase Console for certificate status
- Contact Firebase support if issues persist

### **Redirect Issues?**
- Clear browser cache
- Check if domain is properly configured in Firebase
- Verify DNS records are pointing to correct Firebase IPs

## 📞 **Support**

- **Firebase Support**: [Firebase Console Support](https://firebase.google.com/support)
- **DNS Issues**: Contact your domain provider
- **SSL Issues**: Check Firebase Console → Hosting → Custom domains

---

**Your CCMIS will be accessible at:**
- **Firebase URL**: https://ccmis-f6008.web.app
- **Custom Domain**: https://yourdomain.com (after setup)

**Setup is complete when:**
✅ Domain shows "Connected" in Firebase Console
✅ SSL certificate shows "Valid" 
✅ You can access the app via your custom domain
✅ HTTPS redirect works properly
