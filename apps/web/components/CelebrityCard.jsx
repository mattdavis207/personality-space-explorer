import '../src/App.css'

function CelebrityCard({ celebrity, onClose }) {
  if (!celebrity) return null

  // map numeric indexes to field names based on the parquet structure:
  const name = celebrity[1] || celebrity.name || 'Unknown';
  const category = celebrity[2] || celebrity.category;
  const subcategory = celebrity[3] || celebrity.subcategory;
  const fourLetter = celebrity[4] || celebrity.four_letter;
  const enneagram = celebrity[5] || celebrity.enneagram;
  const socionics = celebrity[6] || celebrity.socionics;
  const big5 = celebrity[7] || celebrity.big_5_SLOAN;

  return (
    <div className="celebrity-card">
      <div className="celebrity-card-header">
        <h2 className="celebrity-card-title">{name}</h2>
        <button className="celebrity-card-close" onClick={onClose}>×</button>
      </div>

      <div className="celebrity-card-content">
        {category && (
          <div className="celebrity-info-item">
            <span className="celebrity-info-label">Category:</span>
            <span className="celebrity-info-value">{category}</span>
          </div>
        )}

        {subcategory && (
          <div className="celebrity-info-item">
            <span className="celebrity-info-label">Subcategory:</span>
            <span className="celebrity-info-value">{subcategory}</span>
          </div>
        )}

        {fourLetter && (
          <div className="celebrity-info-item">
            <span className="celebrity-info-label">MBTI Type:</span>
            <span className="celebrity-info-value">{fourLetter}</span>
          </div>
        )}

        {enneagram && (
          <div className="celebrity-info-item">
            <span className="celebrity-info-label">Enneagram:</span>
            <span className="celebrity-info-value">{enneagram}</span>
          </div>
        )}

        {socionics && (
          <div className="celebrity-info-item">
            <span className="celebrity-info-label">Socionics:</span>
            <span className="celebrity-info-value">{socionics}</span>
          </div>
        )}

        {big5 && (
          <div className="celebrity-info-item">
            <span className="celebrity-info-label">Big 5 SLOAN:</span>
            <span className="celebrity-info-value">{big5}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default CelebrityCard
