$( () => {
  const OS = require('os').type()
  const VERSION = 6
  var fs = require('fs')
  var path = require('path')
  var http = require('http')
  var execFile = require('child_process').execFile
  var async = require('async')
  var unzip = require('unzip')
  var url = require('url')
  var config = require('./config.json')

  if (config.consoles === undefined) {
    config.consoles = {}
  }

  if (config.tags === undefined) {
    config.tags = []
  }

  var consolesMenu = $('#consoles-menu')
  var emulatorsMenu = $('#emulators-menu')
  var gamesList = $('#games-list')
  var mainSegment = $('#main')
  var gameDetail = $('#game-detail')
  var gameCountInfo = $('#game-count-info')
  var addToFavourites = $('#add-to-favourites')
  var addToFavouritesIcon = $('#add-to-favourites-icon')
  var playGameBtn = $('#play-game')
  var tagList = $('#tag-list')
  var gamesTitles = []
  var curIndex = 0
  var curCount = 0
  var curConsole = '';
  var curData = {}
  var ext = null
  var curDownloads = 0
  var needDownload = false
  var gameDataDownloads = 0

  $('.ui.dropdown').dropdown()
  $('.menu .item').tab()
  $('.ui.accordion').accordion()

  try {
    fs.mkdirSync( path.join( __dirname, 'data', 'emulators', OS ) )
  } catch(e) {
  }

  var getDirectories = (srcpath) => {
    if (!fs.existsSync( srcpath )) return []

    return fs.readdirSync( srcpath ).filter( (file) => {
      return fs.statSync( path.resolve( srcpath, file ) ).isDirectory()
    } )
  }

  var download = (url, dest) => {
    var file = fs.createWriteStream( dest )

    return new Promise( (resolve, reject) => {
      var responseSent = false

      http.get( url, response => {
        response.pipe( file )

        file.on( 'finish', () => {
          file.close( () => {
            if (responseSent) return
            responseSent = true
            resolve()
          } )
        } )
      } ).on( 'error', err => {
        if (responseSent) return
        responseSent = true
        reject( err )
      } )
    } )
  }

  var q = async.queue( (task, cb) => {
    download( task.URL, task.target ).then( () => {
      fs.createReadStream( task.target ).pipe( unzip.Extract( { path: path.join( __dirname, 'data', 'emulators', OS ) } ) ).on( 'close', () => {
        fs.unlinkSync( task.target )
        cb()
      } )
    } )
  }, 5 )

  var gamesDataQueue = async.queue( (task, cb) => {
    $.get( task.URL, (gameData) => {
      curData[ task.tag ] = gameData
      cb()
    } )
  }, 5 )

  var playGame = (game) => {
    let emul = $('#emulators-menu > .item.active').text().trim()

    execFile( path.join( __dirname, 'data', 'emulators', OS, curConsole, emul, emul ), [game], (err, data) => {
      if (err) {
        console.log( err )
      } else {
        console.log( data.toString() )
      }
    } )
  }

  var showGame = (gameData) => {
    let images = ''

    if (gameData.images.length > 0) {
      images += '<p><div class="ui link cards">'

      for (let ind = 0, c = gameData.images.length; ind < c; ++ind) {
        images += `<div class="card"><div class="image"><img src="${gameData.images[ ind ]}" /></div></div>`
      }

      images += '</div></p>'
    }

    let html = `<h3>${gameData.title}</h3><p>${gameData.description}</p>${images}`

    gameDetail.html( html )
    gameCountInfo.html( `${curIndex + 1} / ${curCount}` )

    if (config.consoles[ curConsole ] === undefined || config.consoles[ curConsole ].id === undefined) {
      addToFavourites.addClass('atf')
      addToFavourites.attr( 'data-tooltip', 'Add to favourites' )
      addToFavouritesIcon.html('<i class="empty star icon"></i>')
    } else {
      let index = config.consoles[ curConsole ].id.indexOf( curIndex )

      if (index < 0) {
        addToFavourites.addClass('atf')
        addToFavourites.attr( 'data-tooltip', 'Add to favourites' )
        addToFavouritesIcon.html('<i class="empty star icon"></i>')
      } else {
        addToFavourites.removeClass('atf')
        addToFavourites.attr( 'data-tooltip', 'Remove from favourites' )
        addToFavouritesIcon.html('<i class="star icon"></i>')
      }
    }
  }

  var showFavourites = () => {
    if (curData[ curConsole ] === undefined) return

    let html = ''
    let info = {}

    $.each( config.consoles, (consoleName, consoleObj) => {
      let emulators = getDirectories( path.join( __dirname, 'data', 'emulators', OS, consoleName ) )
      let emulItems = ''

      $.each( emulators, (emulIndex, emulName) => {
        emulItems += '<div class="' + (emulIndex == 0 ? 'item active' : 'item') + '">' + emulName + '</div>'
      } )

      for (let i = 0; i < consoleObj.id.length; ++i) {
        let game = curData[ consoleName ][ consoleObj.id[i] ]
        let imgSrc = (game.images.length > 0 ? game.images[0] : '')

        if (info[ config.tags[ consoleObj.tag[i] ] ] === undefined) {
          info[ config.tags[ consoleObj.tag[i] ] ] = ''
        }

        info[ config.tags[ consoleObj.tag[i] ] ] += [
          '<div class="item">',
          `<div class="ui small image"><img src="${imgSrc}" /></div>`,
          '<div class="content">',
          '<div class="ui inverted basic segment">',
          `<div class="header"><h4>${game.title}</h4></div><br/>`,
          '<div class="description"><p>',
          game.description,
          '</p></div>',
          '<div class="extra">',
          '<div class="ui basic inverted right floated buttons">',
          `<div class="ui button play-favourite" cur-console="${consoleName}" game-id="${consoleObj.id[i]}">Play</div>`,
          '<div class="ui floating dropdown icon button">',
          '<i class="dropdown icon"></i>',
          `<div class="menu" id="${consoleName}-${consoleObj.id[i]}">`,
          emulItems,
          '</div>',
          '</div>',
          '</div>',
          '</div>',
          '</div>',
          '</div>',
          '</div>'
        ].join('')
      }
    } )

    $.each( config.tags, (tagIndex, tagName) => {
      html += [
        `<div class="title"><i class="dropdown icon"></i> ${tagName}</div>`,
        '<div class="content"><div class="ui divided items">',
        info[ tagName ],
        '</div></div>'
      ].join('')
    } )

    $('#favourites').html( html )
    $('.ui.dropdown').dropdown()

    $('.play-favourite').click( (e) => {
      let self = $(e.toElement)
      let cons = self.attr('cur-console')
      let gameID = self.attr('game-id')
      let emul = $(`#${cons}-${gameID} > .item.active`).text().trim()

      playFavourite( cons, gameID, emul )
    } )
  }

  var playFavourite = (cons, gameID, emul) => {
    if (curData[ cons ] === undefined) return

    let game = path.join( __dirname, 'data', 'games', `${curData[ cons ][ gameID ].title}${ext[ cons ]}` )
    let emulator = path.join( __dirname, 'data', 'emulators', OS, cons, emul, emul )

    if (fs.existsSync( game )) {
      execFile( emulator, [game], (err, data) => {} )
    } else {
      let fileName = path.join( __dirname, 'data', 'games', curData[ cons ][ gameID ].title + '.zip' )

      download( curData[ cons ][ gameID ].download, fileName ).then( () => {
        fs.createReadStream( fileName ).pipe( unzip.Extract( { path: path.join( __dirname, 'data', 'games' ) } ) ).on( 'close', () => {
          fs.unlinkSync( fileName )
          execFile( emulator, [game], (err, data) => {} )
        } )
      } )
    }
  }

  $('#prev').click( () => {
    if (curData[ curConsole ] === undefined) return
    --curIndex
    if (curIndex < 0) {
      curIndex = curCount - 1
    }
    showGame( curData[ curConsole ][ curIndex ] )
  } )

  $('#next').click( () => {
    if (curData[ curConsole ] === undefined) return
    ++curIndex
    if (curIndex > curCount - 1) {
      curIndex = 0
    }
    showGame( curData[ curConsole ][ curIndex ] )
  } )

  playGameBtn.click( () => {
    if (curData[ curConsole ] === undefined) return

    playGameBtn.addClass('loading')

    if (fs.existsSync( path.join( __dirname, 'data', 'games', curData[ curConsole ][ curIndex ].title + ext[ curConsole ] ) )) {
      playGame( path.join( __dirname, 'data', 'games', curData[ curConsole ][ curIndex ].title + ext[ curConsole ] ) )
      playGameBtn.removeClass('loading')
    } else {
      let fileName = path.join( __dirname, 'data', 'games', curData[ curConsole ][ curIndex ].title + '.zip' )

      download( curData[ curConsole ][ curIndex ].download, fileName ).then( () => {
        fs.createReadStream( fileName ).pipe( unzip.Extract( { path: path.join( __dirname, 'data', 'games' ) } ) ).on( 'close', () => {
          fs.unlinkSync( fileName )
          playGame( path.join( __dirname, 'data', 'games', curData[ curConsole ][ curIndex ].title + ext[ curConsole ] ) )
          playGameBtn.removeClass('loading')
        } )
      } )
    }
  } )

  addToFavourites.click( () => {
    if (addToFavourites.hasClass('atf')) {
      tagList.empty()

      $.each( config.tags, (tagIndex, tagName) => {
        let tag = $('<div/>', { class: 'item', html: tagName } )
        tag.appendTo( tagList )
      } )

      $('#favourites-form')
        .modal( {
          closable: false,
          onApprove: () => {
            let newTag = $('#new-tag').val().trim()
            let existingTag = $('#existing-tag').html().trim()
            let tag = (newTag === '' ? (existingTag === 'Select existing' ? 'none' : existingTag) : newTag)

            if (config.tags.indexOf( tag ) < 0) {
              config.tags.push( tag )
            }

            let tagIndex = config.tags.indexOf( tag )

            if (config.consoles[ curConsole ] === undefined) {
              config.consoles[ curConsole ] = { id: [], tag: [] }
            }

            config.consoles[ curConsole ].id.push( curIndex )
            config.consoles[ curConsole ].tag.push( tagIndex )
            addToFavourites.removeClass('atf')
            addToFavourites.attr( 'data-tooltip', 'Remove from favourites' )
            addToFavouritesIcon.html('<i class="star icon"></i>')

            showFavourites()
            fs.writeFileSync('./config.json', JSON.stringify( config, null, 2 ) )
          }
        } )
        .modal('show')
    } else {
      let index = config.consoles[ curConsole ].id.indexOf( curIndex )
      config.consoles[ curConsole ].id.splice( index, 1 )
      config.consoles[ curConsole ].tag.splice( index, 1 )
      addToFavourites.addClass('atf')
      addToFavourites.attr( 'data-tooltip', 'Add to favourites' )
      addToFavouritesIcon.html('<i class="empty star icon"></i>')

      showFavourites()
      fs.writeFileSync('./config.json', JSON.stringify( config, null, 2 ) )
    }
  } )

  $.get( 'http://snake174.github.io/programs/consoles-games/data/main.json', (data) => {
    if (data.version > VERSION) {
      fs.unlinkSync( path.join( __dirname, 'index.html' ) )
      fs.unlinkSync( path.join( __dirname, 'js', 'script.js' ) )

      download( 'http://snake174.github.io/programs/consoles-games/data/src/index.html', path.join( __dirname, 'index.html' ) ).then( () => {
        download( 'http://snake174.github.io/programs/consoles-games/data/src/script.js', path.join( __dirname, 'js', 'script.js' ) ).then( () => {
          $('#update-message').modal('show')
        } )
      } )
    }

    ext = data.ext
    gameDataDownloads = data.consoles.length

    for (let i = 0; i < data.consoles.length; ++i) {
      gamesDataQueue.push( { URL: data.consoles[i].data, tag: data.consoles[i].tag }, () => {
        --gameDataDownloads

        if (gameDataDownloads == 0) {
          showFavourites()
        }
      } )

      if (!fs.existsSync( path.join( __dirname, 'data', 'emulators', OS, data.consoles[i].tag ) )) {
        needDownload = true
        ++curDownloads
        let fileName = path.join( __dirname, 'data', 'emulators', OS, data.consoles[i].tag + '.zip' )
        let URL = 'http://snake174.github.io/programs/consoles-games/data/emulators/' + OS + '/' + data.consoles[i].tag + '.zip'

        q.push( { URL: URL, target: fileName }, () => {
          --curDownloads

          if (curDownloads == 0) {
            $('#consoles-menu > button')[0].click()
          }
        } )
      }
    }

    $.each( data.consoles, (i, e) => {
      let btn = $('<button/>', { 'class': 'ui button', 'data-tooltip': e.tag, 'data-position': 'bottom left' } )
        .click( () => {
          mainSegment.addClass('loading')
          curConsole = e.tag
          let emulators = getDirectories( path.join( __dirname, 'data', 'emulators', OS, curConsole ) )
          emulatorsMenu.empty()

          $.each( emulators, (emulIndex, emulName) => {
            let emul = $('<div/>', { class: (emulIndex == 0 ? 'item active' : 'item'), html: emulName } )
            emul.appendTo( emulatorsMenu )
          } )

          while (gamesTitles.length > 0) {
            gamesTitles.pop()
          }

          gamesList.empty()

          $.get( e.data, (gameData) => {
            curData[ curConsole ] = gameData
            curIndex = 0
            curCount = gameData.length

            $.each( gameData, (ii, ee) => {
              gamesTitles.push( { title: ee.title, id: ii } )

              let gameBtn = $('<a/>', { class: 'item', text: ee.title, ind: ii } )
                .click( () => {
                  curIndex = ii
                  showGame( gameData[ ii ] )
                  $('html,body').animate( { scrollTop: 0 }, 100 )
                } )

              gameBtn.appendTo( gamesList )
            } )

            $('.ui.search').search( {
              source: gamesTitles,
              searchFullText: false,
              cache: false,
              onSelect: (result, response) => {
                curIndex = result.id
                showGame( gameData[ curIndex ] )
              }
            } )

            showGame( curData[ curConsole ][ curIndex ] )
          } )

          mainSegment.removeClass('loading')
        } )

        btn.prepend( $('<img/>', { src: e.icon } ) )
        btn.appendTo( consolesMenu )
      } )

    if (!needDownload) {
      $('#consoles-menu > button')[0].click()
    }
  } )
} )
