const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'tinyread.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Summaries table
  db.run(`
    CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url_hash TEXT UNIQUE NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      short_summary TEXT NOT NULL,
      medium_summary TEXT NOT NULL,
      detailed_summary TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Analytics table for tracking views and shares
  db.run(`
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summary_id INTEGER,
      event_type TEXT NOT NULL, -- 'view', 'share'
      user_agent TEXT,
      ip_hash TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (summary_id) REFERENCES summaries (id)
    )
  `);
  
  // Index for performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_url_hash ON summaries (url_hash)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_summary_analytics ON analytics (summary_id, event_type)`);
});

// Database operations
const dbOperations = {
  // Get summary by URL hash
  getSummary: (urlHash) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, url_hash, url, title, short_summary, medium_summary, detailed_summary, created_at
        FROM summaries 
        WHERE url_hash = ?
      `;
      
      db.get(query, [urlHash], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  // Create new summary
  createSummary: (summaryData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO summaries (url_hash, url, title, short_summary, medium_summary, detailed_summary)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const { urlHash, url, title, shortSummary, mediumSummary, detailedSummary } = summaryData;
      
      db.run(query, [urlHash, url, title, shortSummary, mediumSummary, detailedSummary], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  },
  
  // Increment view count
  incrementViewCount: (urlHash, userAgent = null, ipHash = null) => {
    return new Promise((resolve, reject) => {
      // First get the summary ID
      db.get('SELECT id FROM summaries WHERE url_hash = ?', [urlHash], (err, row) => {
        if (err) return reject(err);
        if (!row) return reject(new Error('Summary not found'));
        
        // Insert analytics record
        const query = `
          INSERT INTO analytics (summary_id, event_type, user_agent, ip_hash)
          VALUES (?, 'view', ?, ?)
        `;
        
        db.run(query, [row.id, userAgent, ipHash], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  },
  
  // Increment views and get stats in one operation
  incrementAndGetViews: async (urlHash) => {
    await module.exports.incrementViewCount(urlHash);
    return await module.exports.getSummaryStats(urlHash);
  },

  // Get summary statistics
  getSummaryStats: (urlHash) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as view_count,
          COUNT(CASE WHEN event_type = 'share' THEN 1 END) as share_count
        FROM analytics a
        JOIN summaries s ON a.summary_id = s.id
        WHERE s.url_hash = ?
      `;
      
      db.get(query, [urlHash], (err, row) => {
        if (err) reject(err);
        else resolve(row || { view_count: 0, share_count: 0 });
      });
    });
  },
  
  // Get global statistics
  getGlobalStats: () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(DISTINCT s.id) as totalSummaries,
          COUNT(a.id) as totalViews,
          COUNT(a.id) - COUNT(DISTINCT s.id) as totalReuses
        FROM summaries s
        LEFT JOIN analytics a ON s.id = a.summary_id AND a.event_type = 'view'
      `;
      
      db.get(query, [], (err, row) => {
        if (err) reject(err);
        else resolve(row || { totalSummaries: 0, totalViews: 0, totalReuses: 0 });
      });
    });
  },
  
  // Get recent summaries (for admin/monitoring)
  getRecentSummaries: (limit = 10) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.*, COUNT(a.id) as view_count
        FROM summaries s
        LEFT JOIN analytics a ON s.id = a.summary_id AND a.event_type = 'view'
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT ?
      `;
      
      db.all(query, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

module.exports = dbOperations;