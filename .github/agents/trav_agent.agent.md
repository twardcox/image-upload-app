---
description: 'Comprehensive development guidelines for FE development'
model: Claude Sonnet 4.5
title: 'Development Standards'
---

# Core AI Agent Behavior

## Autonomous Problem Solving
- **Complete tasks fully**: Continue until the user's query is completely resolved
- **Iterate until success**: Keep working until the problem is solved and all checklist items are complete
- **Follow through on commitments**: When stating "I will do X", actually perform that action
- **Verify solutions**: Test code rigorously and handle all edge cases before concluding

## Research & Execution Rigor
- **Mandatory, Recursively-Deep Internet Research**: Always use Google and the `fetch_webpage` tool to verify all third-party library, package, and dependency usage, every time you implement or install one. Recursively follow links until you have all relevant information. Never assume your training data is current.
- **Explicit Sequential Planning and Reflection**: Before every function call, plan your steps and reflect on previous outcomes. Don’t just call tools—think and reason about the process.
- **Never End Early**: Do not end your turn until all todo list items are checked off and the problem is fully solved, even if the user says "continue" or "resume." Always continue from the last incomplete step.
- **Edge Case and Robustness Testing**: Rigorously test for all edge cases and iterate until the solution is robust. Failing to do so is the most common failure mode.
- **Act, Don’t Ask**: If you can determine something yourself, do it—don’t ask the user for unnecessary details.

## Communication Standards
- **Announce actions**: Tell the user what you're about to do before making tool calls, in a single concise sentence.
- **Provide progress updates**: Show completed checklist items and next steps
- **Use professional tone**: Casual but professional communication style
- **Explain decisions**: Document why specific approaches were chosen

### Communication Examples
```
"Let me fetch the URL you provided to gather more information."
"Now I'll search the codebase for the function that handles the API requests."
"I need to update several files here - stand by"
"Let's run the tests to make sure everything is working correctly."
```

## Research Requirements
- **Always research dependencies**: Use `fetch_webpage` to verify current package documentation
- **Recursive information gathering**: Follow relevant links and gather comprehensive context
- **Google for current information**: Search for up-to-date library usage and best practices
- **Validate against official docs**: Ensure implementation matches current standards


# Development Workflow

## Problem-Solving Process
1. **Understand the problem**: Read requirements carefully and identify edge cases
2. **Research context**: Fetch URLs, explore codebase, search for existing patterns
3. **Plan incrementally**: Create markdown todo lists with checkboxes
4. **Implement iteratively**: Make small, testable changes
5. **Test rigorously**: Validate functionality across different scenarios
6. **Document decisions**: Explain architectural choices and trade-offs

## Todo List & Communication Protocol
- **Strict Todo List Usage**: Always use a markdown todo list for step-by-step plans, updating it as you progress. Never use HTML or other formats.
- **Announce All Tool Calls**: Always tell the user what you are about to do before making a tool call, in a single concise sentence.

## Todo List Format
Always use this exact format for task tracking:
```markdown
- [ ] Step 1: Description of the first step
- [ ] Step 2: Description of the second step
- [x] Step 3: Completed step (checked off)
```

## Code Investigation Strategy
- **Read large sections**: Always read 2000+ lines at a time for proper context
- **Use semantic search**: Find existing patterns before building new ones
- **Check dependencies**: Explore existing libraries (TanStack Table, shadcn/ui) before custom implementation
- **Validate with tools**: Use `get_errors` to catch TypeScript/ESLint issues

# Code Formatting & Tooling

## Prettier Configuration
- **Auto-formatting**: Ensure Prettier extension is installed and "Format on Save" is enabled
- **Project setup**: Use `@assemble-inc/prettier-config-asm` for consistent formatting
- **Script commands**: Include `format` and `format:fix` npm scripts
- **File coverage**: Format `.{ts,tsx,js,jsx,json,css,scss,html}` files

## ESLint Configuration
- **Linting**: Ensure ESLint extension is installed with auto-fix on save
- **Project setup**: Use `@assemble-inc/eslint-config-asm` for consistent rules
- **Script commands**: Include `lint` and `lint:fix` npm scripts
- **Environment setup**: Configure for both browser and node environments

# TypeScript & React Standards

## Type Safety Best Practices
- **Avoid `as` assertions**: Use proper type guards and validation instead
- **Separate import types**: Use `import type` for type-only imports
- **Remove unused imports**: Clean up immediately based on ESLint warnings
- **Prefix unused parameters**: Use `_param` for intentionally unused parameters
- **Avoid `any` types**: Use proper generic constraints

## React & Next.js Patterns
- **Use `cn()` for classNames**: Always use `cn("base-classes", conditionalClass && "conditional", className)`
- **Avoid string interpolation**: Don't use template literals for className concatenation
- **Implement loading states**: Use skeleton loaders and error boundaries
- **Use Next.js Image**: Always use optimized Image component
- **Form validation**: Combine react-hook-form + zod for robust validation

## React Component Standards

### Component Structure
- **Function expressions**: Use `const Component = () => {}` instead of `function Component()`
- **Export pattern**: Export components at the bottom of the file
- **Function naming**: Use descriptive names that explain the function's purpose
- **Arrow functions**: Prefer arrow functions for event handlers and internal functions

### Component Example
```tsx
const UserProfile = ({ userId, onUpdate }) => {
  const handleProfileUpdate = (data) => {
    // Handle update logic
    onUpdate(data);
  };

  return (
    <div className="user-profile">
      {/* Component content */}
    </div>
  );
};

export default UserProfile;
```

## Function Writing Guidelines
- **Arrow functions**: Use arrow functions for consistency within components
- **Event handlers**: Prefix with `handle` (e.g., `handleClick`, `handleSubmit`)
- **Clear naming**: Function names should read like Shakespeare - clear and expressive
- **Avoid function declarations**: Use function expressions for better hoisting behavior

## Component Architecture

### Component Design Principles
- **Reuse before rebuild**: Search existing codebase and dependencies first
- **Single responsibility**: Each component has one clear purpose
- **Composition over inheritance**: Use composition patterns for reusable logic
- **Proper prop interfaces**: Define clear TypeScript interfaces for all props

### File Organization
- **Feature-based structure**: Group related functionality together
- **Break down large files**: Split pages > 200 lines into focused components
- **API separation**: Place HTTP requests in `src/lib/http/` folder
- **Component folders**: Use `src/app/[page]/components/` for page-specific components

### Naming Conventions
- **Variables/Functions**: `getUsersByRole()`, `isLoading`, `handleSubmit`
- **Files**: `kebab-case.tsx` for regular files, `PascalCase.tsx` for components
- **Constants**: `UPPER_SNAKE_CASE` for true constants
- **CSS Classes**: Follow Tailwind conventions, use kebab-case for custom classes

# Styling Architecture

## CSS/SCSS Modules (Preferred)
- **Scoped styles**: Use CSS modules to scope styles to individual components
- **SCSS integration**: Leverage SCSS features for maintainable stylesheets
- **Component-specific**: Each component should have its own stylesheet
- **Avoid cascade issues**: Modules prevent global style conflicts

## BEM & SMACSS Methodology
When not using modules, follow BEM (Block Element Modifier) naming:
- **Block**: `.component-name` (the main component)
- **Element**: `.component-name__element` (child elements)
- **Modifier**: `.component-name__element--state` (variations or states)

### BEM Example
```tsx
<ul className="user-list">
  <li className="user-list__item">User 1</li>
  <li className="user-list__item user-list__item--active">User 2</li>
</ul>
```

## Styling Performance
- **Avoid deep nesting**: Keep CSS selectors flat for better performance
- **Use child combinators**: Prefer `>` over descendant selectors when possible
- **Right-to-left processing**: Remember CSS processes selectors from right to left
- **Minimize selector specificity**: Keep selectors as simple as possible

### Performance Example
```scss
// Better - more performant
.user-list > .user-list__item > .user-list__link {
  color: blue;
}

// Avoid - less performant
.user-list .user-list__item .user-list__link {
  color: blue;
}
```

## CSS-in-JS Guidelines
- **Avoid inline CSS-in-JS**: Don't write styles directly in components
- **Exception for inline styles**: Simple inline styles are acceptable for dynamic values
- **Separation of concerns**: Keep styles in separate files when possible
- **Reusable helpers**: Create utility classes for commonly repeated styles

# Performance & Optimization

## React Performance
- **Smart memoization**: Use React.memo, useMemo, useCallback appropriately (not excessively)
- **Avoid inline objects**: Don't create objects/arrays in JSX that cause re-renders
- **Component splitting**: Split large components and lazy load when beneficial

## Bundle Optimization
- **Tree shaking**: Import only what you need from libraries
- **Code splitting**: Use dynamic imports for route-based splitting
- **Image optimization**: Use Next.js Image with proper sizing

# Error Handling & Validation

## Form Validation Strategy
- **Client-side validation**: Implement immediate feedback for user input
- **Server-side validation**: Always validate on backend as well
- **Real-time updates**: Use `form.watch()` for dynamic button states
- **Clear error messaging**: Provide actionable error messages

## API Error Handling
- **Graceful degradation**: Handle API failures gracefully
- **Retry mechanisms**: Implement retry logic for transient failures
- **User feedback**: Show meaningful error messages to users

# Testing Strategy

## Manual Testing Requirements
- **Cross-browser compatibility**: Test in different browsers
- **Mobile responsiveness**: Test on mobile devices or dev tools
- **Edge cases**: Test boundary conditions and error states
- **Accessibility testing**: Verify keyboard navigation and screen reader support

## Automated Testing
- **Focus on behavior**: Test what the component does, not how it's implemented
- **Happy path and edge cases**: Test both success and failure scenarios
- **API integration**: Test API interactions and error states

# Frontend (UI/UX) Software Testing

## Testing Philosophy & Purpose

Frontend testing encompasses both User Interface (UI) and User Experience (UX) validation, covering the entire presentation layer of our applications. This includes visual design accuracy, responsive behavior, component interactions, and overall user experience quality.

**Core Principle**: Frontend is not just about visual appearance but also about behavior, responsiveness, and seamless interaction across all touchpoints.

## UX Design Foundation

Our UX testing is built on Peter Morville's usability honeycomb principles:
- **Useful**: Does it serve a purpose and meet user needs?
- **Usable**: Is it easy and efficient to use?
- **Findable**: Can users locate what they need?
- **Credible**: Do users trust and believe in the content?
- **Desirable**: Does it evoke positive emotions and appreciation?
- **Accessible**: Is it usable by people with disabilities?
- **Valuable**: Does it provide value to both users and business?

## Visual Design Testing

### Design Accuracy Validation
- **Design comparison**: Pixel-perfect comparison with Figma/design files
- **Component alignment**: Ensure components match design specifications exactly
- **Visual consistency**: Maintain consistent visual language across the application

### Layout & Spacing Requirements
```css
/* Key measurements to verify */
- Width and height dimensions
- Line height and typography spacing
- Margin and padding consistency
- Border styles and thickness
- Background colors and images
- List styling and formatting
```

### Typography Testing
- **Font family**: Verify correct font loading and fallbacks
- **Font size**: Ensure proper hierarchy and readability
- **Font weight**: Correct bold, regular, light variations
- **Text alignment**: Left, center, right, justified alignment accuracy
- **Text wrapping**: Proper line breaks and overflow handling

### Color Validation
- **Brand colors**: Exact hex/RGB color matching
- **Contrast ratios**: WCAG accessibility compliance (4.5:1 minimum)
- **Color schemes**: Light/dark mode consistency
- **Status colors**: Error (red), success (green), warning (yellow), info (blue)

## Responsive Design Testing

### Device Compatibility Matrix
```typescript
// Device testing requirements
const deviceTypes = {
  mobile: {
    phones: ['iPhone 12/13/14', 'Samsung Galaxy', 'Google Pixel'],
    orientations: ['portrait', 'landscape'],
    viewports: ['375x667', '414x896', '360x640']
  },
  tablet: {
    devices: ['iPad', 'iPad Pro', 'Android tablets'],
    orientations: ['portrait', 'landscape'],
    viewports: ['768x1024', '834x1194', '1024x1366']
  },
  desktop: {
    screens: ['13"', '15"', '22"', '27"', 'ultrawide'],
    resolutions: ['1366x768', '1920x1080', '2560x1440', '3440x1440'],
    modes: ['fullscreen', 'split-screen', 'windowed']
  },
  specialized: {
    devices: ['Apple Watch', 'fitness trackers', 'medical devices'],
    constraints: ['limited screen space', 'touch-only interaction']
  }
};
```

### Responsive Behavior Validation
- **Viewport responsiveness**: Smooth scaling across all screen sizes
- **Content adaptation**: Text, images, and layouts adapt appropriately
- **Touch targets**: Minimum 44px touch targets for mobile
- **Navigation adaptation**: Mobile-friendly navigation patterns

### Multi-language Support
- **Text expansion**: Accommodate longer text in different languages
- **RTL layouts**: Right-to-left language support (Arabic, Hebrew)
- **Character sets**: Unicode and special character handling
- **Cultural considerations**: Date formats, number formats, color meanings

## Component State Testing

### Interactive States Validation
```typescript
// Component states to test
const componentStates = {
  normal: 'Default appearance',
  hover: 'Mouse hover effects',
  focus: 'Keyboard focus indicators',
  active: 'Click/touch active state',
  disabled: 'Disabled/inactive state',
  loading: 'Loading/pending state',
  success: 'Successful operation state',
  error: 'Error/validation state',
  empty: 'No content/empty state'
};
```

### Form Component Testing
- **Input validation**: Real-time and submit validation
- **Error messaging**: Clear, actionable error messages
- **Label association**: Proper label-input relationships
- **Accessibility**: Screen reader compatibility
- **Auto-completion**: Browser autocomplete support

## Component Architecture Testing

### Five-Level Component Validation

#### Level 1: Basic Elements
```typescript
// Atomic UI elements testing
const basicElements = [
  'button', 'input', 'textarea', 'select',
  'checkbox', 'radio', 'link', 'image',
  'icon', 'label', 'paragraph', 'heading'
];
```

#### Level 2: Individual Components
```typescript
// Standalone component testing
const individualComponents = [
  'UserCard', 'SearchBar', 'DataTable',
  'Modal', 'Dropdown', 'Pagination',
  'Breadcrumb', 'Tooltip', 'Alert'
];
```

#### Level 3: Coupled Components
```typescript
// Component composition testing
const coupledComponents = [
  'FormWithValidation', 'SearchWithFilters',
  'TableWithPagination', 'ModalWithForm',
  'NavigationWithSubmenu'
];
```

#### Level 4: Views (Pages)
```typescript
// Full page/view testing
const viewTesting = {
  layout: 'Proper component arrangement',
  navigation: 'Correct routing and links',
  content: 'Accurate data display',
  interactions: 'User flow completion',
  responsiveness: 'Multi-device compatibility'
};
```

#### Level 5: Layouts (Application Shell)
```typescript
// Application-wide layout testing
const layoutTesting = {
  header: 'Navigation, branding, user menu',
  sidebar: 'Navigation, collapsible behavior',
  main: 'Content area, scrolling, overflow',
  footer: 'Links, legal information',
  responsive: 'Mobile/tablet/desktop layouts'
};
```

## Behavioral Testing

### Navigation Testing
- **User flow completion**: Multi-step processes work end-to-end
- **Breadcrumb accuracy**: Correct path representation
- **Deep linking**: Direct URL access to nested pages
- **Back/forward navigation**: Browser history works correctly

### Performance Testing
- **Animation smoothness**: 60fps animations, no jank
- **Load times**: Fast initial page load and subsequent navigations
- **Data synchronization**: Real-time updates work correctly
- **Large dataset handling**: Tables/lists perform well with many items

### Accessibility Testing (a11y)
```typescript
// Accessibility validation checklist
const a11yTesting = {
  keyboard: {
    navigation: 'Tab order logical and complete',
    shortcuts: 'Keyboard shortcuts work',
    focusManagement: 'Focus indicators visible',
    escape: 'Escape key closes modals/dropdowns'
  },
  screenReader: {
    headings: 'Proper heading hierarchy (h1-h6)',
    landmarks: 'Main, nav, aside, footer landmarks',
    altText: 'Descriptive image alt text',
    ariaLabels: 'ARIA labels for complex components'
  },
  visual: {
    colorContrast: 'WCAG AA compliance (4.5:1)',
    textSize: 'Readable at 200% zoom',
    animations: 'Respect prefers-reduced-motion',
    colorBlindness: 'Information not color-dependent'
  }
};
```

## Testing Implementation Strategy

### Manual Testing Protocol
1. **Design Review**: Compare implementation with Figma designs
2. **Device Testing**: Test on actual devices, not just browser dev tools
3. **User Journey Testing**: Complete realistic user workflows
4. **Edge Case Validation**: Test with unusual but valid data
5. **Error Scenario Testing**: Test error states and recovery

### Browser Compatibility Matrix
```typescript
// Supported browser versions
const browserSupport = {
  chrome: 'Last 2 versions',
  firefox: 'Last 2 versions',
  safari: 'Last 2 versions',
  edge: 'Last 2 versions',
  mobile: {
    ios: 'iOS 14+',
    android: 'Android 10+'
  }
};
```

### Testing Tools Integration
- **Visual regression**: Percy, Chromatic for visual diff testing
- **Accessibility**: axe-core, Lighthouse accessibility audits
- **Performance**: Lighthouse, WebPageTest for performance metrics
- **Cross-browser**: BrowserStack for device/browser testing

## Content & Data Testing

### Text Content Validation
- **Copy accuracy**: Spelling, grammar, tone consistency
- **Content length**: Text fits in designed containers
- **Overflow handling**: Graceful text truncation or expansion
- **Dynamic content**: User-generated content displays correctly

### Data Format Testing
```typescript
// Data format validation
const dataFormats = {
  dates: ['MM/DD/YYYY', 'DD/MM/YYYY', 'relative dates'],
  numbers: ['currency', 'percentages', 'large numbers'],
  addresses: ['US format', 'international format'],
  phone: ['US format', 'international format']
};
```

### Image and Media Testing
- **Image optimization**: Proper sizing and format selection
- **Loading states**: Skeleton loaders while images load
- **Error handling**: Graceful fallback for missing images
- **Alt text**: Descriptive alternative text for screen readers

## Quality Assurance Process

### Pre-Development Testing
- **Requirements review**: Understand user needs and acceptance criteria
- **Design system compliance**: Ensure components follow design standards
- **Technical feasibility**: Verify implementation approach

### Development Testing
- **Component isolation**: Test components in Storybook
- **Integration testing**: Test component interactions
- **User flow testing**: Test complete user journeys
- **Performance profiling**: Monitor for performance regressions

### Pre-Release Testing
- **Cross-browser validation**: Test in all supported browsers
- **Device testing**: Test on real devices
- **Accessibility audit**: Run automated and manual a11y tests
- **Performance validation**: Lighthouse scores meet requirements

### User Experience Validation
```typescript
// UX testing approach
const uxValidation = {
  usabilityTesting: {
    method: 'Observe users completing tasks',
    metrics: ['task completion rate', 'time to completion', 'error rate'],
    feedback: 'Qualitative feedback on experience'
  },
  feedbackCollection: {
    surveys: 'Post-interaction satisfaction surveys',
    interviews: 'In-depth user interviews',
    analytics: 'Behavioral analytics and heatmaps'
  },
  iterativeImprovement: {
    dataAnalysis: 'Analyze user behavior patterns',
    hypothesis: 'Form hypotheses for improvements',
    testing: 'A/B test proposed changes',
    implementation: 'Implement validated improvements'
  }
};
```

## Testing Documentation Requirements

### Test Case Documentation
- **Test scenarios**: Detailed steps for manual testing
- **Expected outcomes**: Clear success criteria
- **Browser matrix**: Which browsers/devices to test
- **Accessibility checklist**: Specific a11y requirements

### Bug Reporting Standards
```typescript
// Bug report template
const bugReport = {
  title: 'Concise description of the issue',
  severity: 'Critical | High | Medium | Low',
  browser: 'Browser and version',
  device: 'Device type and OS version',
  steps: 'Detailed reproduction steps',
  expected: 'Expected behavior',
  actual: 'Actual behavior',
  screenshots: 'Visual evidence of the issue',
  console: 'Console errors or warnings'
};
```

### Testing Metrics & KPIs
- **Visual consistency**: Design implementation accuracy percentage
- **Performance metrics**: Core Web Vitals scores
- **Accessibility score**: Lighthouse accessibility score
- **Cross-browser compatibility**: Pass rate across browser matrix
- **User satisfaction**: Post-testing survey scores

This comprehensive testing approach ensures that our frontend implementations meet both technical requirements and user experience standards, providing a solid foundation for quality assurance throughout the development lifecycle.

# Security Best Practices

## Input Validation
- **Sanitize inputs**: Always validate and sanitize user inputs
- **XSS prevention**: Properly escape output and use CSP headers
- **SQL injection prevention**: Use parameterized queries

## Authentication & Authorization
- **Secure authentication**: Implement proper authentication flows
- **Role-based access**: Implement granular permission systems
- **Session management**: Handle sessions securely with proper timeouts

# Next.js Security Standards

## Security Mindset & Architecture

### Zero Trust Approach
- **Server Components as untrusted**: Handle Server Components at runtime as unsafe/untrusted by default
- **No internal network assumptions**: Don't assume internal network or zones of trust
- **Explicit authorization**: Every data access requires explicit user authorization checks

### Core Security Principles
- **Principle of least privilege**: Components should only receive minimal data needed
- **Defense in depth**: Multiple layers of security validation
- **Secure by default**: Default configurations should be the most secure option

## Data Handling Security Patterns

### HTTP APIs (Recommended for Large/Existing Projects)
```typescript
// Server Component data fetching
const UserDashboard = async ({ userId }: { userId: string }) => {
  // Always pass cookies for authentication
  const response = await fetch(`${API_BASE}/users/${userId}/dashboard`, {
    headers: {
      'Cookie': cookies().toString(),
      'Authorization': `Bearer ${getServerToken()}`
    }
  });

  // Validate response and handle errors
  if (!response.ok) {
    throw new Error('Unauthorized access');
  }

  const data = await response.json();
  return <DashboardView data={data} />;
};
```

**Security Guidelines:**
- Only call custom API endpoints using `fetch()` from Server Components
- Always pass authentication cookies and tokens
- Watch for access control that assumes internal network safety
- Validate all API responses before use

### Data Access Layer (Recommended for New Projects)
```typescript
// Centralized data access layer
// src/lib/data-access/users.ts
import 'server-only';

interface AuthenticatedUser {
  id: string;
  role: string;
  permissions: string[];
}

export async function getUserDashboard(
  currentUser: AuthenticatedUser,
  targetUserId: string
) {
  // Authorization check before data access
  if (!canAccessUserData(currentUser, targetUserId)) {
    throw new Error('Insufficient permissions');
  }

  // Parameterized query to prevent SQL injection
  const dashboardData = await db.query(
    'SELECT * FROM user_dashboard WHERE user_id = $1 AND visible = true',
    [targetUserId]
  );

  return dashboardData;
}

function canAccessUserData(user: AuthenticatedUser, targetId: string): boolean {
  return user.id === targetId || user.permissions.includes('admin');
}
```

**Security Benefits:**
- Consistent data access patterns reduce authorization bugs
- Better team cohesion with single programming language
- Shared in-memory cache across request parts
- Centralized security policy enforcement

### Component Level Data Access (Prototyping Only)
```typescript
// Direct database access in Server Components
// Use only for prototyping - not production
import 'server-only';

const UserProfile = async ({ params }: { params: { id: string } }) => {
  const currentUser = await getCurrentUser();

  // Validate user can access this profile
  if (currentUser.id !== params.id && !currentUser.isAdmin) {
    redirect('/unauthorized');
  }

  // Always use parameterized queries
  const profile = await db.query(
    'SELECT name, email, created_at FROM users WHERE id = $1',
    [params.id]
  );

  return <ProfileView profile={profile} />;
};
```

**Security Requirements:**
- Always use parameterized queries to prevent SQL injection
- Validate user authorization before any database access
- Avoid exposing sensitive data through component props

## Server-Only Code Protection

### Server-Only Module Enforcement
```typescript
// src/lib/server-only/sensitive-operations.ts
import 'server-only';

// This module will error if imported by Client Components
export async function getSecretKeys() {
  return process.env.SECRET_API_KEYS;
}

export async function processPayment(amount: number, token: string) {
  // Sensitive payment processing logic
  return paymentGateway.charge(amount, token);
}
```

### React Taint API (Next.js 14+)
```typescript
import { experimental_taintObjectReference } from 'react';

// Mark objects that should never be sent to client
const sensitiveUserData = {
  id: user.id,
  name: user.name,
  internalNotes: user.internalNotes, // Sensitive
  creditCard: user.creditCard        // Sensitive
};

// Taint the sensitive object
experimental_taintObjectReference(
  'Sensitive user data should not be sent to client',
  sensitiveUserData
);
```

**Protection Layers:**
- `server-only` import prevents client-side execution
- React Taint API prevents accidental data leakage
- Data Access Layer filters data before component access

## SSR vs RSC Security Models

### Client Component Security Policy
```typescript
// Client Components follow browser security model
'use client';

interface SafeUserProps {
  id: string;
  name: string;
  avatar: string;
  // Never include: email, phone, internal notes, tokens
}

const UserCard = ({ user }: { user: SafeUserProps }) => {
  // This data is visible to the browser
  return (
    <div className="user-card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
    </div>
  );
};
```

### Server Component Security Policy
```typescript
// Server Components handle sensitive data
const AdminUserView = async ({ userId }: { userId: string }) => {
  const currentUser = await getCurrentUser();

  // Server-side authorization
  if (!currentUser.isAdmin) {
    return <UnauthorizedMessage />;
  }

  // Can access sensitive data on server
  const fullUserData = await getUserWithSensitiveInfo(userId);

  // Only pass safe data to Client Components
  return (
    <div>
      <UserCard user={{
        id: fullUserData.id,
        name: fullUserData.name,
        avatar: fullUserData.avatar
      }} />
      {/* Server-rendered sensitive info stays on server */}
      <ServerOnlyDetails data={fullUserData.sensitiveInfo} />
    </div>
  );
};
```

## Read Operations Security

### URL Parameter Validation
```typescript
// pages/users/[id]/page.tsx
interface PageParams {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

const UserPage = async ({ params, searchParams }: PageParams) => {
  // NEVER trust URL parameters - always validate
  const userId = validateUserId(params.id);
  const filters = validateSearchParams(searchParams);

  const currentUser = await getCurrentUser();

  // Re-verify authorization on every request
  if (!canAccessUser(currentUser, userId)) {
    redirect('/unauthorized');
  }

  // Safe to proceed with validated, authorized request
  const userData = await getUserData(currentUser, userId, filters);
  return <UserView data={userData} />;
};

function validateUserId(id: string): string {
  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(id)) {
    throw new Error('Invalid user ID format');
  }
  return id;
}
```

### Security Anti-Patterns to Avoid
```typescript
// ❌ DON'T: Trust URL parameters without validation
const BadComponent = async ({ params }: { params: { id: string } }) => {
  // Never directly use params.id without validation
  const user = await db.query('SELECT * FROM users WHERE id = ?', [params.id]);
  return <div>{user.data}</div>;
};

// ❌ DON'T: Use searchParams for side effects
const BadSearchHandler = async ({ searchParams }: { searchParams: any }) => {
  if (searchParams.logout) {
    // Never use GET for side effects
    await logoutUser(); // This is wrong!
  }
};

// ✅ DO: Use Server Actions for mutations
const GoodComponent = () => {
  async function handleLogout() {
    'use server';
    const user = await getCurrentUser();
    if (user) {
      await performSecureLogout(user.id);
      redirect('/login');
    }
  }

  return (
    <form action={handleLogout}>
      <button type="submit">Logout</button>
    </form>
  );
};
```

## Write Operations Security

### Server Actions Security
```typescript
// Server Actions must validate user and input
async function updateUserProfile(formData: FormData) {
  'use server';

  // 1. Always validate current user first
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Authentication required');
  }

  // 2. Validate the target user authorization
  const targetUserId = formData.get('userId') as string;
  if (currentUser.id !== targetUserId && !currentUser.isAdmin) {
    throw new Error('Insufficient permissions');
  }

  // 3. Validate and sanitize all input data
  const updateData = validateProfileUpdate({
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    bio: formData.get('bio') as string
  });

  // 4. Perform the authorized update
  await updateUser(targetUserId, updateData);

  // 5. Revalidate relevant caches
  revalidatePath(`/users/${targetUserId}`);
}

function validateProfileUpdate(data: any): UserUpdateData {
  const schema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    bio: z.string().max(500).optional()
  });

  return schema.parse(data);
}
```

### Form Security Patterns
```typescript
// Secure form component with Server Action
const ProfileForm = ({ user }: { user: User }) => {
  return (
    <form action={updateUserProfile}>
      {/* Always include user ID for authorization */}
      <input type="hidden" name="userId" value={user.id} />

      <input
        type="text"
        name="name"
        defaultValue={user.name}
        required
        maxLength={100}
      />

      <input
        type="email"
        name="email"
        defaultValue={user.email}
        required
      />

      <textarea
        name="bio"
        defaultValue={user.bio}
        maxLength={500}
      />

      <button type="submit">Update Profile</button>
    </form>
  );
};
```

## Security Validation Checklist

### Pre-Development Security Review
- [ ] Identify all data access patterns in the feature
- [ ] Define authorization requirements for each operation
- [ ] Choose appropriate data handling method (HTTP API, Data Access Layer, Component Level)
- [ ] Plan Server Action security for any mutations

### Code Review Security Items
- [ ] All Server Actions validate current user authorization
- [ ] URL parameters are validated before use
- [ ] No sensitive data is passed to Client Components
- [ ] Parameterized queries are used for database access
- [ ] Server-only modules are properly marked
- [ ] No side effects in GET requests or searchParams

### Security Testing Requirements
- [ ] Test unauthorized access attempts
- [ ] Verify SQL injection protection
- [ ] Test with malformed URL parameters
- [ ] Verify sensitive data doesn't leak to client
- [ ] Test Server Action input validation
- [ ] Verify proper error handling without information disclosure

## Common Security Vulnerabilities & Prevention

### Authorization Bypass Prevention
```typescript
// ❌ Vulnerable: Missing authorization check
async function getUserOrders(userId: string) {
  return await db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
}

// ✅ Secure: Always check authorization
async function getUserOrders(currentUser: User, userId: string) {
  if (!canAccessUserOrders(currentUser, userId)) {
    throw new Error('Unauthorized');
  }
  return await db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
}
```

### Data Leakage Prevention
```typescript
// ❌ Vulnerable: Exposing internal data
const UserProfile = async ({ userId }: { userId: string }) => {
  const user = await getFullUserRecord(userId);
  return <UserCard user={user} />; // Leaks sensitive data
};

// ✅ Secure: Filter sensitive data
const UserProfile = async ({ userId }: { userId: string }) => {
  const user = await getFullUserRecord(userId);
  const safeUserData = {
    id: user.id,
    name: user.name,
    avatar: user.avatar
    // Exclude: email, phone, internal notes, etc.
  };
  return <UserCard user={safeUserData} />;
};
```

This comprehensive security framework ensures that Next.js applications follow security best practices while maintaining good developer experience and performance.

# Pull Request Standards

## Pre-submission Checklist
- **Rebase before PR**: Ensure branch is up-to-date with dev branch
- **Run pre-push hooks**: Execute all project validation scripts
- **Self-review PR**: Read through entire PR to confirm intended changes
- **Check compilation**: Use `get_errors` tool to validate TypeScript

## PR Content Requirements

### Title Format
`TICKET-NUMBER: Descriptive title of what was implemented`
Example: `RXS-1497: Implement Submitter History Section for Appeal Details`

### Description Structure
1. **What was solved**: Clear explanation of the problem addressed
2. **Technical approach**: Implementation decisions and architectural choices
3. **Files changed**: Summary of modified/added files with descriptions
4. **Testing performed**: How changes were validated
5. **Unusual approaches**: Document any non-standard solutions and reasoning

### Code Scope Guidelines
- **Ticket-focused only**: Include only changes pertinent to the assigned ticket
- **No unrelated refactoring**: Avoid unnecessary changes to unrelated code
- **Remove debug code**: Clean up console.logs, temporary comments, test code
- **No commented-out code**: Remove unused code blocks entirely

## Code Review Response Protocol
- **Address ALL comments**: Respond to every reviewer comment
- **Don't resolve others' comments**: Only resolve comments you initiated
- **Provide explanations**: Explain your approach when making changes
- **Follow-up commits**: Make additional commits rather than force-pushing

# Brand & Content Standards

## Terminology
- **Use "ASMBL"** instead of "support" in user-facing text
- **Consistent labels**: Use "Invite users" for user invitation features
- **Professional tone**: Maintain consistent, professional communication

## UI Consistency
- **Design system adherence**: Follow established design patterns
- **Component reuse**: Use existing components before creating new ones
- **Spacing consistency**: Use consistent spacing patterns throughout

# Useful Code Snippets & Patterns

## Common Regular Expressions
```javascript
// US Phone Number
const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

// Email validation
const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

// Currency (dollars and cents)
const currencyRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

// Credit card number (basic)
const creditCardRegex = /^[0-9]{13,19}$/;

// UUID v4
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
```

## Date/Time Utilities
```javascript
// Format date for display
const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date));
};

// Format relative time
const formatRelativeTime = (date: Date | string) => {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffTime = new Date(date).getTime() - Date.now();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return rtf.format(diffDays, 'day');
};

// Check if date is today
const isToday = (date: Date | string) => {
  const today = new Date();
  const checkDate = new Date(date);
  return checkDate.toDateString() === today.toDateString();
};
```

## Array/Object Utilities
```javascript
// Group array by property
const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    (result[group] = result[group] || []).push(item);
    return result;
  }, {} as Record<string, T[]>);
};

// Remove duplicates by property
const uniqueBy = <T, K extends keyof T>(array: T[], key: K): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

// Deep merge objects
const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
};
```

## String Utilities
```javascript
// Capitalize first letter
const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// Convert to title case
const toTitleCase = (str: string): string =>
  str.replace(/\w\S*/g, txt =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );

// Truncate with ellipsis
const truncate = (str: string, length: number): string =>
  str.length > length ? str.slice(0, length) + '...' : str;

// Generate slug from string
const slugify = (str: string): string =>
  str.toLowerCase()
     .replace(/[^\w\s-]/g, '')
     .replace(/[\s_-]+/g, '-')
     .replace(/^-+|-+$/g, '');
```

## React Hook Patterns
```typescript
// Custom hook for local storage
const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
};

// Custom hook for debounced value
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
```

# Image Handling & Optimization

## Next.js Image Component Best Practices
```tsx
import Image from 'next/image';

// Standard responsive image
const ResponsiveImage = ({ src, alt }: { src: string; alt: string }) => (
  <Image
    src={src}
    alt={alt}
    width={800}
    height={600}
    style={{
      width: '100%',
      height: 'auto',
    }}
    priority={false} // Set true for above-fold images
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..." // Low-res base64
  />
);

// Avatar with fallback
const Avatar = ({ src, name, size = 40 }: { src?: string; name: string; size?: number }) => (
  <div className="relative">
    {src ? (
      <Image
        src={src}
        alt={`${name}'s avatar`}
        width={size}
        height={size}
        className="rounded-full"
        style={{ objectFit: 'cover' }}
      />
    ) : (
      <div
        className="bg-gray-300 rounded-full flex items-center justify-center text-gray-600"
        style={{ width: size, height: size }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    )}
  </div>
);
```

## Image Size Guidelines
```typescript
// Recommended image dimensions
const imageSizes = {
  thumbnail: { width: 150, height: 150 },
  avatar: { width: 80, height: 80 },
  card: { width: 400, height: 300 },
  hero: { width: 1200, height: 600 },
  fullWidth: { width: 1920, height: 1080 }
};

// Responsive sizes attribute
const responsiveSizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";
```

### Asset Structure
```
public/
  images/
    products/
      product-1/
        thumbnail-100x100.jpg
        small-400x300.jpg
        medium-800x600.jpg
        large-1200x900.jpg
    icons/
      icon-name.svg
    backgrounds/
      hero-bg-mobile.jpg
      hero-bg-desktop.jpg
```

### Naming Conventions
- **Descriptive names**: `product-thumbnail-100x100.jpg` not `img1.jpg`
- **Size indicators**: Include dimensions in filename when relevant
- **Device variants**: Suffix with `-mobile`, `-tablet`, `-desktop` when needed
- **Consistent format**: Use kebab-case for file names

# Discouraged Packages & Alternatives

## ⚠️ Packages to Avoid (Greenfield Projects)

### Lodash/Underscore
- **Why avoid**: Functionality is mostly syntactic sugar on native JS features
- **Transparency concern**: Native language functionality should be preferred when available
- **Alternative approach**: Use native JS methods or copy specific utility functions into codebase
- **Exception**: If specific functions are needed, copy source code into repo (e.g., `deepMerge`)

### Material UI (MUI)
- **Why avoid**: Inability to change baked-in behavior, difficult bug fixes, refactoring issues
- **Performance concerns**: Unintended side effects when overriding default behavior
- **Alternatives**:
  - **asm-ui** (company library)
  - **Radix UI Primitives** (headless components)
  - **Radix UI Themes** (styled components)

### Vue.js
- **Why avoid**: Team expertise is React-focused
- **Staffing issues**: Developers learn Vue out of necessity, creating maintenance burden
- **Alternatives**:
  - **React.js** for component libraries
  - **Next.js** for full-stack applications

### Create React App (CRA)
- **Why avoid**: Deprecated by React core team, outdated tooling
- **Performance issues**: Slower than modern alternatives, less flexible
- **Alternatives**:
  - **Vite** for React projects
  - **create-next-app** for Next.js projects

### JSS/CSS-in-JS
- **Why avoid**: Team preference for standard CSS knowledge
- **Philosophy**: Intimate understanding of CSS cascade is preferred
- **Alternatives**:
  - **SCSS** (preferred)
  - **SCSS modules** (scoped styles)
  - **CSS** (standard)
  - **Tailwind** (utility-first)

### Found Router
- **Why avoid**: Small developer community, poor documentation, difficult to Google
- **Adoption issues**: Development stalled despite Facebook origin
- **Alternatives**:
  - **React Router** (standard React routing)
  - **Reach Router** (merged with React Router)
  - **Next.js Router** (for Next.js apps)

### Gatsby
- **Why avoid**: Difficult to debug, poor versioning, extremely long build times
- **Staffing issues**: Limited developer availability and willingness
- **Alternative**: **Next.js** (does everything Gatsby does more elegantly)

### JavaScript Models in React
- **Why avoid**: Don't align with React component lifecycle or virtual DOM
- **Performance issues**: React rendering optimizations not fully utilized
- **Alternative**: **Helper function files** for data manipulation

### Moment.js
- **Why avoid**: **Officially deprecated** and no longer maintained
- **Bundle size**: Large bundle impact for date functionality
- **Alternatives**:
  - **Day.js** (lightweight, moment-compatible API)
  - **date-fns** (modular, functional approach)

## ✅ Recommended Library Selection Process

### Before Adding Any Dependency
1. **Check native solutions**: Can this be done with vanilla JS/CSS?
2. **Verify maintenance**: Is the library actively maintained?
3. **Bundle impact**: What's the size impact on the final bundle?
4. **Team expertise**: Does the team have experience with this library?
5. **Company standards**: Is there an approved company alternative?

### Preferred Technology Stack
- **Framework**: Next.js (full-stack) or Vite + React (frontend-only)
- **Styling**: SCSS modules, Tailwind, or standard CSS
- **UI Components**: Radix UI Primitives + custom styling
- **Routing**: Next.js Router or React Router
- **Date handling**: Day.js or date-fns
- **Utilities**: Native JS methods or custom utility functions

### When Exceptions Are Needed
- **Document reasoning**: Explain why the discouraged package is necessary
- **Get team approval**: Discuss with team before introducing discouraged dependencies
- **Plan migration**: Have a plan for eventual migration to preferred alternatives
- **Isolate usage**: Contain the discouraged package to specific modules/components
