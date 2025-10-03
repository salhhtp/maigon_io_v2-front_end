# Monitoring & Analytics Setup Guide

## 🔍 **Monitoring Strategy**

### **Built-in Monitoring ✅**

The application already includes:

- **Error Boundary**: Catches and handles React errors gracefully
- **Performance Monitoring**: Core Web Vitals, load times, component performance
- **Comprehensive Logging**: Structured logging with context and user tracking
- **Error Handling**: Standardized error handling with user-friendly messages

## 📊 **Recommended Monitoring Services**

### **1. Error Tracking - Sentry (Recommended)**

The codebase now ships with first-class Sentry instrumentation for both the Vite React client and the Express API server. You only need to provide credentials.

#### **Setup Checklist:**

1. [Connect to Sentry](#open-mcp-popover) and note your organization, project, and DSN. (If you cannot create projects via MCP due to permissions, create one manually in the Sentry UI and copy the DSN.)
2. Configure the following environment variables:
   - `VITE_SENTRY_DSN` – client DSN (required for browser reporting)
   - `VITE_SENTRY_TRACES_SAMPLE_RATE` (optional, default `0.1`)
   - `VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` (optional, default `0.1`)
   - `VITE_SENTRY_REPLAYS_ERROR_SAMPLE_RATE` (optional, default `1`)
   - `SENTRY_DSN` – server DSN (can reuse the client DSN if you prefer)
   - `SENTRY_TRACES_SAMPLE_RATE` (optional, default `0.1`)
   - `SENTRY_ENVIRONMENT` / `VITE_APP_ENV` (optional, for custom environment names)
   - `SENTRY_RELEASE` / `VITE_SENTRY_RELEASE` (optional, release tagging)
3. (Optional) Enable automated source map uploads by setting build-time variables:
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`

#### **How it works in code:**

- `client/lib/sentry.ts` initialises Sentry with Browser Tracing & Session Replay when `VITE_SENTRY_DSN` is present.
- `client/App.tsx` bootstraps the client instrumentation before rendering.
- `client/components/ErrorBoundary.tsx` forwards captured errors to Sentry automatically.
- `server/index.ts` wires Sentry’s request, tracing, and error handlers into Express when `SENTRY_DSN` is provided.

#### **Testing the integration:**

```bash
# In development, trigger a test error after configuring the DSN
npm run dev
# Then open the app and execute in the browser console:
throw new Error("Sentry test error")
```

Visit Sentry to confirm the event appears with environment, release, and breadcrumbs.

#### **Benefits:**

- Real-time error tracking
- Performance monitoring (frontend & backend)
- User session replay (configurable sample rates)
- Release tracking with version tags
- Centralised logging and alerting

### **2. User Analytics - Google Analytics 4**

#### **Setup Instructions:**

```html
<!-- Add to index.html -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "GA_MEASUREMENT_ID", {
    page_title: "Maigon",
    custom_map: {
      custom_parameter_1: "user_type",
      custom_parameter_2: "contract_type",
    },
  });
</script>
```

#### **Custom Event Tracking:**

```typescript
// Track contract review events
const trackContractReview = (contractType: string, reviewType: string) => {
  gtag("event", "contract_review_started", {
    event_category: "engagement",
    event_label: contractType,
    custom_parameter_1: reviewType,
    value: 1,
  });
};

// Track user actions
const trackUserAction = (action: string, context?: Record<string, any>) => {
  gtag("event", action, {
    event_category: "user_action",
    ...context,
  });
};
```

### **3. Performance Monitoring - Already Implemented ✅**

The app includes built-in performance monitoring that tracks:

- **Core Web Vitals**: LCP, FID, CLS
- **Navigation Timing**: DNS, TCP, load times
- **Resource Loading**: Slow resources identification
- **Component Performance**: Render times and lifecycle tracking

#### **Accessing Performance Data:**

```typescript
import { performanceMonitor } from "@/utils/performance";

// Get current metrics
const metrics = performanceMonitor.getCurrentMetrics();

// Track custom operations
performanceMonitor.measureAsync("custom-operation", async () => {
  // Your operation here
});
```

## 📈 **Business Analytics Setup**

### **Key Metrics to Track:**

#### **User Engagement:**

- Contract uploads by type
- Review completion rates
- Time spent per review
- Feature usage patterns
- User retention rates

#### **Business Metrics:**

- Conversion rates (trial to paid)
- Monthly Active Users (MAU)
- Contract review volumes
- User satisfaction scores
- Support ticket volumes

### **Custom Analytics Implementation:**

```typescript
// analytics.ts
class Analytics {
  static trackContractUpload(contractType: string, userId: string) {
    // Track in Google Analytics
    gtag("event", "contract_upload", {
      event_category: "contract",
      event_label: contractType,
      user_id: userId,
    });

    // Log for internal analytics
    logger.userAction("Contract uploaded", {
      contractType,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  static trackReviewCompletion(
    contractType: string,
    reviewType: string,
    duration: number,
    userId: string,
  ) {
    gtag("event", "review_completed", {
      event_category: "contract",
      event_label: `${contractType}_${reviewType}`,
      value: duration,
      user_id: userId,
    });

    logger.contractAction("Review completed", undefined, {
      contractType,
      reviewType,
      duration,
      userId,
    });
  }

  static trackUserJourney(step: string, userId: string, metadata?: any) {
    gtag("event", "user_journey", {
      event_category: "journey",
      event_label: step,
      user_id: userId,
      ...metadata,
    });
  }
}
```

## 🚨 **Alert Configuration**

### **Critical Alerts:**

- **Error Rate > 5%**: Immediate notification
- **Page Load Time > 5s**: Performance degradation
- **Email Delivery Failure**: Authentication system issues
- **Database Connection Issues**: Service availability

### **Business Alerts:**

- **Daily Signup Drop > 50%**: Potential funnel issues
- **Contract Review Failures > 10%**: AI system problems
- **Support Ticket Spike**: User experience issues

## 📊 **Dashboard Setup**

### **Technical Dashboard:**

- Error rates and trends
- Performance metrics (Core Web Vitals)
- API response times
- Database query performance
- Email delivery rates

### **Business Dashboard:**

- User acquisition and retention
- Contract review metrics
- Revenue and conversion rates
- Feature adoption rates
- User satisfaction scores

## 🔧 **Implementation Steps**

### **Phase 1: Error Monitoring (High Priority)**

1. [Connect to Sentry](#open-mcp-popover) for error tracking
2. Configure error alerting thresholds
3. Set up Slack/email notifications
4. Test error reporting flow

### **Phase 2: User Analytics (Medium Priority)**

1. Set up Google Analytics 4
2. Implement custom event tracking
3. Create conversion funnels
4. Set up goal tracking

### **Phase 3: Business Intelligence (Medium Priority)**

1. Create custom analytics dashboard
2. Set up automated reporting
3. Implement A/B testing framework
4. Configure business metric alerts

### **Phase 4: Advanced Monitoring (Low Priority)**

1. Set up uptime monitoring
2. Implement log aggregation
3. Create operational dashboards
4. Set up automated incident response

## 📋 **Monitoring Checklist**

### **Pre-Production:**

- [ ] Error boundary implemented ✅
- [ ] Performance monitoring active ✅
- [ ] Logging system configured ✅
- [ ] Sentry error tracking configured
- [ ] Google Analytics set up
- [ ] Alert thresholds defined
- [ ] Dashboard created

### **Post-Production:**

- [ ] Monitor error rates (< 1%)
- [ ] Track Core Web Vitals (all green)
- [ ] Verify email delivery rates (> 95%)
- [ ] Monitor user engagement metrics
- [ ] Review performance trends weekly
- [ ] Analyze user feedback patterns

## 🎯 **Success Metrics**

### **Technical KPIs:**

- **Uptime**: > 99.9%
- **Error Rate**: < 1%
- **Page Load Time**: < 3s
- **Core Web Vitals**: All green

### **Business KPIs:**

- **User Activation**: > 80% complete first review
- **Retention**: > 60% return within 7 days
- **Satisfaction**: > 4.5/5 user rating
- **Support Load**: < 5% users need help

## 🔗 **Integration with Existing System**

The monitoring setup integrates seamlessly with the existing:

- **Error Boundary**: Automatically reports React errors
- **Logger**: Structured logging feeds into monitoring
- **Performance Monitor**: Real-time metrics collection
- **Error Handler**: User-friendly error reporting

## 🚀 **Quick Start Commands**

```bash
# Install monitoring dependencies
npm install @sentry/react @sentry/tracing

# Set up environment variables
VITE_SENTRY_DSN=your_sentry_dsn
VITE_GA_MEASUREMENT_ID=your_ga_id

# Deploy with monitoring
npm run build && npm run deploy
```

---

**🎯 Next Steps:**

1. Connect Sentry for error tracking
2. Set up Google Analytics
3. Configure critical alerts
4. Create monitoring dashboard
5. Test all monitoring systems
