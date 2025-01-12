import mixpanel from 'mixpanel-browser';

// Initialize mixpanel
mixpanel.init('ac336fb08750ee8fe5ca5e51790b922c', {
  debug: true,
  track_pageview: true,
  persistence: 'localStorage'
});

// Wrapper functions for tracking
export const track = (name: string, props?: any) => {
  console.log("📊 Mixpanel track:", name, props);
  mixpanel.track(name, props);
};

export const identify = (id: string) => {
  mixpanel.identify(id);
};

export default mixpanel;