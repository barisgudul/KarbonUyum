# 🚀 KarbonUyum - Quick Start Guide

## ⚡ 2-Minute Startup

### 1️⃣ Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
# Ready at: http://localhost:8000/docs
```

### 2️⃣ Frontend
```bash
cd frontend
npm run dev
# Ready at: http://localhost:3000
```

## 🎯 What's Ready?

✅ **GHG Protocol Scope 1/2/3** - Automatic scope detection  
✅ **Climatiq API** - Real-time emission calculations  
✅ **CSV Upload** - Bulk data import with validation  
✅ **Rate Limiting** - API cost protection  
✅ **Fallback Mechanism** - Smart error handling with ⚠️  
✅ **Modern UI** - shadcn/ui Dialog system  
✅ **City Factors** - Location-specific analytics  

## 🧪 Quick Test

1. **Add Company**: Click "+ Yeni Şirket" (Modal opens) ✅
2. **Add Facility**: Click "+ Tesis" in company row ✅
3. **Add Activity**: Click "+ Veri" → Fill form → Check scope auto-assigned ✅
4. **CSV Upload**: Click "📁 CSV Yükle" → Download template → Upload sample ✅
5. **Check Dashboard**: Scope 1/2 graphs + ⚠️ fallback indicators ✅

## 📊 Database Status

```
✅ 10 tables created
✅ 3 migrations applied successfully
✅ 17 suggestion parameters loaded
✅ 10 city-specific factors configured
✅ 5 sample activity records with scope
```

## 🔑 Environment Variables

**Backend** (`.env`):
```
DATABASE_URL=postgresql://...
CLIMATIQ_API_KEY=<from https://climatiq.io>
SECRET_KEY=<your-secret>
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 Documentation

- **Full Report**: `FAZ_1D_TAMAMLANDI.md`
- **Deployment**: `DEPLOYMENT_CHECKLIST.md`
- **API Docs**: http://localhost:8000/docs

## 🎉 Status

**Phase 1.D**: ✅ COMPLETE  
**All Migrations**: ✅ APPLIED  
**Code Quality**: ✅ 0 ERRORS  
**Ready for**: ✅ PRODUCTION

---

**Next Phase**: Faz 2 - Benchmarking v1 (η~2 hafta)
