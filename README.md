# Quiz Tracker Frontend

The frontend files for the Quiz Funnel Retention Tracker. This includes the tracking script, demo quiz, and analytics dashboard.

## What's Included

- **quiz-tracker.js** - The main tracking script you drop into any quiz
- **quiz-demo.html** - A demo quiz to test the tracking
- **dashboard.html** - Real-time analytics dashboard
- **CSS & JS files** - Separated for better organization

## Quick Setup

### 1. Add Tracking to Your Quiz

Just include the script in your quiz page:

```html
<script src="quiz-tracker.js"></script>
<script>
    window.quizTracker = new QuizTracker();
    window.quizTracker.init();
</script>
```

That's it! The script will automatically detect your slides and start tracking.

### 2. View Analytics

Open `dashboard.html` in your browser to see real-time analytics. Make sure your Laravel backend is running first.

## How the Tracking Works

The script is pretty smart - it automatically finds your quiz slides using common selectors like:
- `.slide`, `.step`, `.question`
- `[data-slide]`, `[data-step]`
- Any element with "slide" or "step" in the class name

If it can't find slides automatically, it falls back to detecting visible elements on the page.

### What Gets Tracked

- **Page entry** - When someone starts your quiz
- **Slide visits** - Every time someone moves to a new slide
- **Time spent** - How long they stay on each slide
- **Session data** - Unique session per browser tab

### Slide Metadata

For each slide, we capture:
- **Slide ID** - Usually from the element ID or data attributes
- **Slide Title** - Extracted from h1-h6 elements
- **Slide Sequence** - The order/position of the slide

## The Dashboard

The dashboard shows you everything you need to know:

### Real-time Data
- **Active Users** - People currently on each slide (last 5 minutes)
- **Total Users** - Everyone who's ever visited each slide
- **Completion Rate** - Percentage who finish the quiz
- **Drop-off Analysis** - Where people are leaving

### Visual Features
- **Live Indicators** - "● LIVE NOW" for active slides
- **Pulsing Animation** - Highlights real-time activity
- **Auto-refresh** - Updates every 3 seconds
- **Charts** - Retention funnel and drop-off analysis

## Configuration

### Basic Setup
The script works out of the box, but you can customize it:

```javascript
const tracker = new QuizTracker({
    apiBaseUrl: 'http://127.0.0.1:8000',  // Your Laravel API URL
    retryAttempts: 3,                      // How many times to retry failed requests
    retryDelay: 1000                       // Delay between retries (ms)
});
```

### Quiz ID Extraction
The script automatically extracts a quiz ID from your URL:
- `https://offer.nebroo.com/lead2` → `lead2`
- `https://yoursite.com/quiz/marketing` → `marketing`

## Testing

### Demo Quiz
Open `quiz-demo.html` to test the tracking system. It includes:
- 11 sample slides with different question types
- Progress bar and navigation
- Manual completion button for testing

### Dashboard Testing
Open `dashboard.html` to see the analytics in action:
1. Select a quiz from the dropdown
2. Watch real-time data updates
3. Test the refresh button
4. View charts and detailed analytics

## Browser Support

Works in all modern browsers:
- Chrome, Firefox, Safari, Edge
- Mobile browsers
- Requires ES6+ support

## Troubleshooting

### Common Issues

**Script not tracking slides**
- Make sure your slides have proper IDs or classes
- Check browser console for errors
- Verify the API URL is correct

**Dashboard not loading data**
- Ensure Laravel backend is running
- Check the API URL in the dashboard
- Look for CORS errors in the browser console

**No active users showing**
- Active users are those who visited slides in the last 5 minutes
- Try refreshing the dashboard
- Check if the backend is receiving tracking data

### Debug Mode
Add this to see what the tracker is doing:

```javascript
const tracker = new QuizTracker({
    debug: true  // Shows console logs
});
```

## Customization

### Styling
The CSS files are well-organized and easy to customize:
- `dashboard.css` - Dashboard appearance
- `quiz-demo.css` - Demo quiz styling

### Functionality
The JavaScript files use jQuery for easy DOM manipulation:
- `dashboard.js` - Dashboard logic and API calls
- `quiz-demo.js` - Demo quiz interactions
- `quiz-tracker.js` - Core tracking functionality

## API Integration

The frontend communicates with these backend endpoints:

- `POST /api/tracking/session/start` - Start tracking session
- `POST /api/tracking/slide/visit` - Record slide visit
- `POST /api/tracking/session/complete` - Complete session
- `GET /api/analytics/quiz/{quizId}` - Get analytics data
- `GET /api/analytics/quizzes` - List available quizzes

## Performance

The tracking script is lightweight and won't slow down your quiz:
- **~9KB** minified tracking script
- **Non-blocking** API calls
- **Efficient** slide detection
- **Minimal** DOM manipulation

## Security

- No personal data collected
- Session-based tracking only
- Respects user privacy
- CORS properly configured

---
