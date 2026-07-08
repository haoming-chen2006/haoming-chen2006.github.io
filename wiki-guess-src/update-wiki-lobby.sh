sed -i '' -e '/<p className="hint">{t(lang, '\'inviteHint\'')}<\/p>/i\
          <div className="player-list">\
            <p><strong>Players ({connected + 1})</strong></p>\
            <ul>\
              <li>{name} (You)</li>\
              {Object.values(peers).map((p) => (\
                <li key={p.id}>{p.name}</li>\
              ))}\
            </ul>\
          </div>\
' src/App.jsx
