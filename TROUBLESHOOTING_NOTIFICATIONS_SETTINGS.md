# Troubleshooting: Notifications & Settings Pages Not Opening

## ✅ Files Verified
- ✅ `/app/participant/notifications/page.tsx` exists
- ✅ `/app/participant/settings/page.tsx` exists
- ✅ API functions are exported correctly
- ✅ No linting errors
- ✅ Proper exports and structure

## 🔧 Troubleshooting Steps

### Step 1: Restart Next.js Dev Server
The dev server needs to detect new routes. 

**In your terminal (where frontend is running):**
1. Press `Ctrl+C` to stop the server
2. Run: `npm run dev`
3. Wait for compilation to complete
4. Try accessing the pages again

### Step 2: Clear Next.js Cache
Sometimes Next.js cache can cause issues:

```bash
cd front-end
# Delete .next folder
rm -rf .next  # On Mac/Linux
# OR on Windows PowerShell:
Remove-Item -Recurse -Force .next

# Then restart
npm run dev
```

### Step 3: Hard Refresh Browser
Clear browser cache:
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### Step 4: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try navigating to `/participant/notifications` or `/participant/settings`
4. Look for any JavaScript errors

### Step 5: Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try navigating to the pages
4. Check if the page requests are being made
5. Look for 404 errors or other HTTP errors

### Step 6: Verify Routes Manually
Try accessing these URLs directly:
- `http://localhost:3000/participant/notifications`
- `http://localhost:3000/participant/settings`
- `http://localhost:3001/participant/notifications` (if using port 3001)
- `http://localhost:3002/participant/notifications` (if using port 3002)

### Step 7: Check Terminal for Compilation Errors
Look at your frontend terminal for:
- Compilation errors
- Module not found errors
- TypeScript errors
- Any red error messages

## 🐛 Common Issues & Solutions

### Issue 1: "404 Not Found"
**Cause**: Next.js hasn't detected the new routes
**Solution**: Restart dev server (Step 1)

### Issue 2: "Module not found: Can't resolve '@/lib/api'"
**Cause**: Path alias issue
**Solution**: 
- Verify `tsconfig.json` has `"@/*": ["./*"]`
- Restart TypeScript server in your IDE
- Restart dev server

### Issue 3: Page loads but shows blank/error
**Cause**: Runtime error in component
**Solution**: 
- Check browser console for errors
- Check terminal for compilation errors
- Verify all imports are correct

### Issue 4: Authentication redirect loop
**Cause**: `getCurrentUser()` failing
**Solution**: 
- Check if backend is running
- Check if cookies are being sent
- Verify API_BASE_URL is correct

## ✅ Quick Fix Commands

**Windows PowerShell:**
```powershell
cd front-end
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

**Mac/Linux:**
```bash
cd front-end
rm -rf .next
npm run dev
```

## 📋 Verification Checklist

After restarting, verify:
- [ ] Dev server shows "✓ Ready" message
- [ ] No compilation errors in terminal
- [ ] Can access `/participant/dashboard` (existing page)
- [ ] Can access `/participant/notifications` (new page)
- [ ] Can access `/participant/settings` (new page)
- [ ] No errors in browser console
- [ ] Sidebar navigation works

## 🆘 If Still Not Working

1. **Check file permissions**: Make sure files are readable
2. **Check file encoding**: Should be UTF-8
3. **Verify Next.js version**: Should be 14.x
4. **Check for conflicting routes**: Make sure no other files conflict
5. **Try creating a simple test page**: Create `/app/test/page.tsx` with just "Hello" to verify routing works

## 📞 Next Steps

If pages still don't work after trying all steps:
1. Share the exact error message from browser console
2. Share any terminal errors
3. Share the URL you're trying to access
4. Share what happens when you click the navigation links




