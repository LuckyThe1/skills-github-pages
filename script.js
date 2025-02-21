let currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
let activeRainIntensity = null;
let isThunderActive = false;
let rainInterval = null;

class NotificationManager {
  constructor() {
    this.container = document.getElementById('notification-container');
    this.thunderSound = new Audio('https://actions.google.com/sounds/v1/weather/thunderstorm.ogg');
    this.rainSound = new Audio('/30 MINUTES Gentle Rain at Night, Rain Sounds for Sleep, Insomnia, Relaxing, Meditation, Yoga, Study.mp3');
    this.rainSound.loop = true;

    this.rainSound.onerror = (error) => {
      console.error("Error loading rain sound:", error);
    };
    this.thunderSound.onerror = (error) => {
      console.error("Error loading thunder sound:", error);
    };

    this.connectWebSocket();
  }

  connectWebSocket() {
    // Build WebSocket URL dynamically based on the current host and protocol.
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = window.location.port ? ':' + window.location.port : '';
    const wsUrl = `${wsProtocol}//${window.location.hostname}${port}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.showNotification(data);
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }

  showNotification(data) {
    const notification = document.createElement('div');
    notification.className = 'notification';

    notification.innerHTML = `
      <div class="notification-avatar" style="background-image: url('${data.avatar}')"></div>
      <div class="notification-content">
        <div class="notification-username">${data.username}</div>
        <div>${data.content}</div>
      </div>
    `;

    this.container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// YouTube Music Player
class MusicPlayer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.ready = false;
    this.queue = [];
    this.currentTrackIndex = -1;
    this.searchResults = [];
    this.initPlayer();
    this.addEventListeners();
  }

  initPlayer() {
    if (window.YT) {
      this.createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => this.createPlayer();
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }

  createPlayer() {
    this.player = new YT.Player('youtube-player', {
      height: '0',
      width: '0',
      events: {
        'onReady': () => {
          this.ready = true;
          if (this.queue.length > 0) {
            this.playTrack(this.queue.shift());
          }
        },
        'onStateChange': this.handlePlayerStateChange.bind(this)
      }
    });
  }

  async search(query) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query)}&type=video&key=${this.apiKey}`);
    const data = await response.json();
    this.searchResults = data.items;
    this.displayResults(this.searchResults);
  }

  displayResults(items) {
    const container = document.getElementById('search-results');
    container.innerHTML = items.map((item, index) => `
      <div class="search-result" data-index="${index}" data-id="${item.id.videoId}">
        <div>${item.snippet.title}</div>
        <div class="channel">${item.snippet.channelTitle}</div>
      </div>
    `).join('');
  }

  playTrack(videoId) {
    if (this.ready) {
      this.player.loadVideoById(videoId);
      this.player.playVideo();
    } else {
      this.queue.push(videoId);
    }
    this.isPlaying = true;
  }

  handlePlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      document.getElementById('play-pause').innerHTML = '<i class=\'bx bx-pause\' ></i>';
    } else {
      document.getElementById('play-pause').innerHTML = '<i class=\'bx bx-play\' ></i>';
    }
  }

  loadAndPlayTrack(index) {
    if (index >= 0 && index < this.searchResults.length) {
      const videoId = this.searchResults[index].id.videoId;
      this.currentTrackIndex = index;
      this.currentTrack = {
        id: videoId,
        title: this.searchResults[index].snippet.title,
        channel: this.searchResults[index].snippet.channelTitle
      };
      this.playTrack(videoId);
      this.updateNowPlayingDisplay();
    }
  }

  updateNowPlayingDisplay() {
    if (this.currentTrack) {
      document.getElementById('now-playing').classList.remove('hidden');
      document.getElementById('track-title').textContent = this.currentTrack.title;
      document.getElementById('track-channel').textContent = this.currentTrack.channel;
    } else {
      document.getElementById('now-playing').classList.add('hidden');
      document.getElementById('track-title').textContent = '';
      document.getElementById('track-channel').textContent = '';
    }
  }

  addEventListeners() {
    document.getElementById('search-btn').addEventListener('click', () => {
      const query = document.getElementById('music-search').value;
      if (query) this.search(query);
    });

    document.getElementById('search-results').addEventListener('click', (e) => {
      const result = e.target.closest('.search-result');
      if (result) {
        const index = parseInt(result.dataset.index, 10);
        this.loadAndPlayTrack(index);
      }
    });

    document.getElementById('play-pause').addEventListener('click', () => {
      if (this.isPlaying) {
        this.player.pauseVideo();
      } else {
        this.player.playVideo();
      }
      this.isPlaying = !this.isPlaying;
    });

    document.getElementById('prev-track').addEventListener('click', () => {
      if (this.currentTrackIndex > 0) {
        this.loadAndPlayTrack(this.currentTrackIndex - 1);
      } else if (this.currentTrackIndex === 0) {
        this.player.seekTo(0);
      }
    });

    document.getElementById('next-track').addEventListener('click', () => {
      if (this.currentTrackIndex < this.searchResults.length - 1 && this.currentTrackIndex !== -1) {
        this.loadAndPlayTrack(this.currentTrackIndex + 1);
      } else {
        this.player.pauseVideo();
        this.isPlaying = false;
        this.currentTrack = null;
        this.currentTrackIndex = -1;
        this.updateNowPlayingDisplay();
      }
    });
  }
}

function generateWeatherEffects() {
  const container = document.querySelector('.background-container');

  if (!document.querySelector('.thunder')) {
    const thunder = document.createElement('div');
    thunder.className = 'thunder';
    container.appendChild(thunder);
  }

  setInterval(() => {
    const oldDrops = document.querySelectorAll('.rain');
    if (oldDrops.length > 100) {
      oldDrops[0].remove();
    }
  }, 1000);
}

function createRainDrop(intensity) {
  const maxDrops = document.querySelectorAll('.rain').length;
  if (maxDrops > 100) return;

  const rain = document.createElement('div');
  rain.className = `rain ${intensity}`;
  rain.style.left = `${Math.random() * 100}%`; 
  rain.style.animationDelay = `${Math.random() * 2}s`; 
  document.querySelector('.background-container').appendChild(rain);

  rain.addEventListener('animationend', () => rain.remove());
}

function generateStars() {
  const starsContainer = document.getElementById('stars');
  starsContainer.innerHTML = '';

  for (let i = 0; i < 200; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.width = `${Math.random() * 2}px`;
    star.style.height = star.style.width;
    star.style.animationDelay = `${Math.random() * 2}s`;
    starsContainer.appendChild(star);
  }
}

function toggleRainEffect(intensity) {
  if (rainInterval) {
    clearInterval(rainInterval);
    rainInterval = null;
    document.querySelectorAll('.rain').forEach(drop => drop.remove());
    return;
  }

  const frequencies = { soft: 200 };
  rainInterval = setInterval(() => createRainDrop(intensity), frequencies[intensity]);
}

function startRainCycle() {
  function enableRain() {
    toggleRainEffect('soft');
    setTimeout(disableRain, 600000); // 10 minutes
  }

  function disableRain() {
    toggleRainEffect('soft');
    setTimeout(enableRain, 600000); // 10 minutes
  }

  enableRain();
}

function updateTime() {
  const now = new Date();
  const timeElement = document.getElementById('time');
  const greetingElement = document.getElementById('greeting');

  const timeString = now.toLocaleTimeString('en-US', {
    timeZone: currentTimezone,
    hour12: true,
    hour: 'numeric',
    minute: 'numeric'
  });

  const hour = now.getHours();
  let greeting = hour < 12 ? 'Good morning' :
                hour < 18 ? 'Good afternoon' :
                'Good evening';

  timeElement.textContent = timeString;
  greetingElement.textContent = greeting;
}

function createTimezoneDropdown() {
  const modal = document.createElement('div');
  modal.className = 'timezone-dropdown-modal';

  const dropdown = document.createElement('div');
  dropdown.className = 'timezone-dropdown';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search timezone...';
  searchInput.className = 'timezone-search';
  dropdown.appendChild(searchInput);

  const timezoneOptionsContainer = document.createElement('div'); 
  timezoneOptionsContainer.className = 'timezone-options-container';
  dropdown.appendChild(timezoneOptionsContainer);

  function populateTimezones(timezonesToDisplay) {
    timezoneOptionsContainer.innerHTML = ''; 
    timezonesToDisplay.forEach(tz => {
      const option = document.createElement('div');
      option.className = 'timezone-option';
      option.textContent = tz;
      option.onclick = () => {
        currentTimezone = tz;
        updateTime();
        modal.remove();
      };
      timezoneOptionsContainer.appendChild(option);
    });
  }

  const timezones = Intl.supportedValuesOf('timeZone');
  populateTimezones(timezones); 

  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredTimezones = timezones.filter(tz => tz.toLowerCase().includes(searchTerm));
    populateTimezones(filteredTimezones);
  });

  modal.appendChild(dropdown);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  document.body.appendChild(modal);
}

generateStars();
generateWeatherEffects();
updateTime();
setInterval(updateTime, 1000);

document.getElementById('time').onclick = createTimezoneDropdown;

const notifications = new NotificationManager();

// Initialize Music Player with user's API key
const musicPlayer = new MusicPlayer('AIzaSyCJKMg7-VjadY8Mu55BRn3y-kziRSj3EJE');

document.querySelectorAll('[data-effect="thunder"], [data-effect="rain"]').forEach(btn => btn.remove());

startRainCycle();
