# EcoReport - Waste Management System UI

A modern, professional waste management system built with Next.js 15, Tailwind CSS, and Shadcn UI components.

## 🌱 Features

### 1. **Landing & Reporting Page** (Public)
- Professional hero section with environmental messaging
- Glassmorphism-styled waste reporting form
- Image upload with drag-and-drop support
- Form validation using React Hook Form + Zod
- Success notifications via Sonner toasts
- Fully responsive mobile-first design

### 2. **Admin Login Page**
- Minimalist secure login interface
- Email and password authentication
- Loading state indicators
- Demo credentials display
- Beautiful gradient decorative elements
- Responsive layout with side illustration

### 3. **Admin Dashboard** (Protected)
- Sidebar navigation with routes
- Real-time statistics cards:
  - Total Reports count
  - Pending reports
  - Completed reports
- Professional data table:
  - Report ID, Reporter name, Location
  - Image thumbnail with lightbox
  - Status badges with color coding
  - Action buttons for status updates
- Status update modal for report management
- Analytics page with detailed statistics:
  - Completion rate visualization
  - Geographic distribution
  - Status breakdown charts
  - Top reported locations

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing & Reporting Page
│   │   ├── layout.tsx               # Root Layout
│   │   ├── global.css               # Global Styles
│   │   ├── admin/
│   │   │   └── login/
│   │   │       └── page.tsx         # Admin Login Page
│   │   └── dashboard/
│   │       ├── page.tsx             # Main Dashboard
│   │       └── stats/
│   │           └── page.tsx         # Statistics Page
│   ├── components/
│   │   ├── ui/                      # Shadcn UI Components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── card.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── toaster.tsx
│   │   ├── Header.tsx               # Navigation Header
│   │   ├── Sidebar.tsx              # Dashboard Sidebar
│   │   ├── WasteReportForm.tsx      # Main Report Form
│   │   ├── ReportsTable.tsx         # Reports Data Table
│   │   └── StatCard.tsx             # Statistics Card
│   ├── hooks/
│   │   └── useFileUpload.ts         # File Upload Hook
│   ├── lib/
│   │   ├── api.ts                   # API Service Layer
│   │   ├── axios.tsx                # Axios Configuration
│   │   └── utils.ts                 # Utility Functions
│   └── types/
│       └── index.ts                 # TypeScript Types
└── .env.example                      # Template environment variables
└── .env                              # Local/EC2 environment variables
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or higher
- npm or yarn package manager
- Backend API running on `http://localhost:8080`

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Environment Setup:**
Create or update `.env` (copy from `.env.example`):
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Untuk deployment EC2, ganti nilai di `.env` menjadi:
```
NEXT_PUBLIC_API_URL=http://<EC2_PUBLIC_IP_OR_DOMAIN>:8080
```

Opsional untuk development lintas host/device:
```
NEXT_ALLOWED_DEV_ORIGINS=http://192.168.56.1:3000,http://localhost:3000
```

3. **Run development server:**
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Build for Production
```bash
npm run build
npm run start
```

## 🎨 Design System

### Color Palette
- **Primary Green**: `#16a34a` (green-600) - Eco-friendly, trustworthy
- **Emerald**: `#059669` (emerald-600) - Secondary accent
- **Gray**: `#f3f4f6` (gray-50) - Clean backgrounds
- **Status Colors**:
  - Pending: Yellow/Warning
  - In Progress: Blue
  - Completed: Green

### Typography
- **Font**: Geist Sans (modern, tech-focused)
- **Fallback**: System fonts for optimal performance

### Components
- Custom built components using Tailwind CSS
- Lucide React icons for consistent iconography
- Responsive design (mobile-first approach)
- Accessibility-focused (WCAG compliant)

## 📝 Key Features

### Form Handling
- **Validation**: React Hook Form + Zod schema validation
- **Error Display**: Inline error messages for better UX
- **File Upload**: Drag-and-drop with file preview
- **Loading States**: Visual feedback during submission

### API Integration
- **Axios-based**: Interceptor for automatic token injection
- **Error Handling**: Consistent error toast notifications
- **Authentication**: JWT token management via localStorage

### Responsive Design
- Mobile-first approach
- Tailwind breakpoints (sm, md, lg)
- Touch-friendly UI elements
- Optimized for all screen sizes

## 🔐 Authentication

### Protected Routes
- `/dashboard` - Main reports dashboard
- `/dashboard/stats` - Statistics page
- Auto redirects unauthenticated users to login

### Token Management
- Stored in localStorage
- Automatically injected in API requests
- Cleared on logout

## 📊 Data Types

### Report Model
```typescript
interface Report {
  id: string;
  reporterName: string;
  location: string;
  description: string;
  imageUrl?: string;
  imageThumbnail?: string;
  status: 'pending' | 'in-progress' | 'done';
  createdAt: string;
  updatedAt: string;
}
```

## 🔌 API Endpoints

### Required Backend Endpoints

1. **POST /api/reports** - Create new report
   - FormData: reporterName, location, description, images

2. **GET /api/reports** - Fetch all reports
   - Returns: Array of Report objects

3. **PATCH /api/reports/:id** - Update report status
   - Body: { status: string }

4. **POST /api/auth/login** - Admin authentication
   - Body: { email, password }

## 🎯 Features Breakdown

### Landing Page
- ✅ Hero section with messaging
- ✅ Stats display (reports, areas cleaned)
- ✅ Features showcase
- ✅ Waste report form component
- ✅ Footer with links
- ✅ Scroll-to-form button

### Reporting Form
- ✅ Reporter name input
- ✅ Location input (with map pin icon)
- ✅ Waste description textarea
- ✅ Drag-and-drop image upload
- ✅ File preview with delete option
- ✅ Success toast notification
- ✅ Form validation with error display
- ✅ Loading state during submission

### Admin Login
- ✅ Email/password inputs
- ✅ Form validation
- ✅ Remember me checkbox
- ✅ Forgot password link
- ✅ Demo credentials display
- ✅ Beautiful layout with gradients
- ✅ Error handling

### Dashboard
- ✅ Statistics cards (total, pending, completed)
- ✅ Reports data table
- ✅ Status update modal
- ✅ Image lightbox viewer
- ✅ Responsive sidebar navigation
- ✅ Mobile menu toggle
- ✅ Logout functionality

### Statistics Page
- ✅ Completion rate visualization
- ✅ Status breakdown charts
- ✅ Location analytics
- ✅ Top reported areas
- ✅ Progress indicators

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4+
- **UI Components**: Custom built with Shadcn patterns
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Validation**: Zod
- **HTTP Client**: Axios
- **Notifications**: Sonner
- **Font**: Geist (Google Fonts)

## 📱 Responsive Breakpoints

- **Mobile**: < 640px (full width)
- **Tablet**: 640px - 1024px (md)
- **Desktop**: > 1024px (lg)

## ♿ Accessibility

- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Focus states on interactive elements
- Color contrast compliance
- Form error announcements

## 🚨 Error Handling

- Network error toast notifications
- Form validation error display
- Authentication error redirects
- API error messages
- Graceful loading states

## 🔧 Environment Setup

### Development
- Hot reload enabled (Next.js dev server)
- TypeScript strict mode
- ESLint configuration included

### Production
- Optimized bundle size
- Image optimization
- Code splitting
- Static generation where possible

## 📦 Dependencies

```json
{
  "dependencies": {
    "axios": "^1.15.0",
    "lucide-react": "^latest",
    "next": "16.2.3",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-hook-form": "^latest",
    "zod": "^latest",
    "@hookform/resolvers": "^latest",
    "sonner": "^latest"
  }
}
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in package.json dev script
"dev": "next dev -p 3001"
```

### API Connection Issues
- Check backend is running on configured URL
- Verify CORS is enabled on backend
- Check `.env.local` API URL

### Build Errors
```bash
# Clear build cache
rm -rf .next

# Reinstall dependencies
npm install

# Rebuild
npm run build
```

## 📞 Support & Contact

For issues or questions:
1. Check the GitHub repository
2. Review the documentation
3. Contact the development team

## 📄 License

MIT License - Free to use and modify

## 🎉 Credits

Built with ❤️ for environmental management and community cleanup efforts.

---

**Last Updated**: April 2026
**Status**: Production Ready ✅
