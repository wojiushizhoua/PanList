// Enter your account cookies below.
// Or comment out those, then add them into CloudFlare Environment Variables.
const BDUSS = ''
const STOKEN = ''

// Keep default for now.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.514.1919.810 Safari/537.36'

const listHeader = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0,maximum-scale=1.0, user-scalable=no"/>
	<title>PanList</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mdui@0.4.1/dist/css/mdui.min.css" integrity="sha256-lCFxSSYsY5OMx6y8gp8/j6NVngvBh3ulMtrf4SX5Z5A=" crossorigin="anonymous">
	<script src="https://cdn.jsdelivr.net/npm/mdui@0.4.1/dist/js/mdui.min.js" integrity="sha256-dZxrLDxoyEQADIAGrWhPtWqjDFvZZBigzArprSzkKgI=" crossorigin="anonymous"></script>
  <style> 
  html{height:100%;}
  body{min-height:100%;margin:0;padding:0;position:relative;}
  footer {
    /* I don't know anything about CSS, somebody pls help me */
    width: 100%;
    line-height: 40px;
    bottom:0;
    background: #f2f2f2;
    border-top: 1px solid #e4e4e4;
    font-size: 10pt;
    color: #222;
  }
  footer text, footer a {
    margin-left: 30px;
    color: #666;
    display: inline-block;
    line-height: 40px;
    font-family: sans-serif;
    font-size: 10pt;
    margin-right: 30px;
    text-decoration: none;
  }
  footer>a:visited {
    color: #609;
  }
		.mdui-appbar .mdui-toolbar{
			height:56px;
			font-size: 16px;
		}
		.mdui-toolbar>*{
			padding: 0 6px;
			margin: 0 2px;
			opacity:0.5;
		}
		.mdui-toolbar>.mdui-typo-headline{
			padding: 0 16px 0 0;
		}
		.mdui-toolbar>i{
			padding: 0;
		}
		.mdui-toolbar>a:hover,a.mdui-typo-headline,a.active{
			opacity:1;
		}
		.mdui-container{
			max-width:980px;
		}
		.mdui-list-item{
			-webkit-transition:none;
			transition:none;
		}
		.mdui-list>.th{
			background-color:initial;
		}
		.mdui-list-item>a{
			width:100%;
			line-height: 48px
		}
		.mdui-list-item{
			margin: 2px 0px;
			padding:0;
		}
		.mdui-toolbar>a:last-child{
			opacity:1;
		}
		@media screen and (max-width:980px){
			.mdui-list-item .mdui-text-right{
				display: none;
			}
			.mdui-container{
				width:100% !important;
				margin:0px;
      }
      
			.mdui-toolbar>*{
				display: none;
			}
			.mdui-toolbar>a:last-child,.mdui-toolbar>.mdui-typo-headline,.mdui-toolbar>i:first-child{
				display: block;
			}
		}
	</style>
</head>`

const listFooter = `</ul></div></div></div>
<footer class="footer">
<text><a href="https://github.com/teardr0p/PanList" target="_blank">Powered by PanList</a><a class="mdui-hidden-xs mdui-float-right" href="?clearcache=1">清除本页缓存</a></text>
</footer>
</body></noscript></html>`

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request,event))
})

async function handleRequest(request,event) {
  const url = new URL(request.url)
  const host = request.headers.get('Host')
  const dlpath = request.url.split(host)[1]
  const path = request.url.split(host)[1].split('?')[0]
  let params = url.searchParams;
  const page = params.get('page') == null || params.get('page') == undefined || params.get('page') == '' ? 1 : parseInt(params.get('page'))
  let response
  if(params.get('download') == 1){
    response = await downloadFile(path,request,event)
  }
  else if(path.match(/\/file\/\w{32}/)){
    response = await down(params.get('bdhost'),dlpath,request)
  }
  else if(params.get('clearcache') == 1){
    response = await clearCache(path,page,event)
  }
  else{
    response = new Response(await getFileList(path,page,event), {
      headers: { 'content-type': 'text/html;charset=utf-8' },
    })
  }
  return response
}

async function downloadFile(path,request,event){
  // No cache
  /*const getLink = await fetch('http://d.pcs.baidu.com/rest/2.0/pcs/file?method=locatedownload&app_id=250528&path='+path,{
    headers:{
      'user-agent': 'netdisk;11.4.5.14',
      'Cookie': 'BDUSS=' + BDUSS + ';'
    },
    method: 'GET'
  })*/
  const getLinkRequest = new Request('http://d.pcs.baidu.com/rest/2.0/pcs/file?method=locatedownload&app_id=250528&path='+path.replace('+','%2B').replace('&','%26'),{
    headers:{
      'user-agent': 'netdisk;11.4.5.14',
      'Cookie': 'BDUSS=' + BDUSS + ';'
    },
    method: 'GET'
  })
  const getLink = await handleCache(getLinkRequest,event,3600)
  const dldata = JSON.parse(await getLink.text())
    if(getLink.status == 200){
      const realLink = 'qdall01.baidupcs.com' + dldata['path']
      const getTrueLink = await fetch('http://'+realLink,{
        headers:{
          'user-agent': 'netdisk;11.4.5.14'
        },
        redirect:"manual" 
      })
      if(getTrueLink.status == 302){
        const trueLink = getTrueLink.headers.get('Location')
        const uriLink = new URL(trueLink)
        return new Response('{"errno":302}',{
          status: 302,
          headers:{
            'Location':uriLink.pathname+uriLink.search+'&bdhost='+uriLink.host
          }
        })
      }
    }
    return false
}

async function clearCache(path,page,event){
  const cacheRequest = new Request('http://pan.baidu.com/api/list?order=time&desc=1&showempty=0&web=1&page='+page+'&num=50&dir='+path.replace('+','%2B').replace('&','%26')+'&channel=chunlei&web=1&app_id=250528&clienttype=0',{
    headers:{
      'Cookie':'BDUSS='+BDUSS+'; STOKEN='+STOKEN+';',
      'User-Agent':USER_AGENT
    }
  })
  const cacheUrl = new URL(cacheRequest.url)
  const cacheKey = new Request(cacheUrl.toString(), cacheRequest)
  let cache = await caches.default
  let response = await cache.delete(cacheKey)
  if(response){
    console.log('cache deleted')
  }
  return new Response(await getFileList(path,page,event), {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  })
}

// https://developers.cloudflare.com/workers/examples/cache-api
async function handleCache(request,event,cacheTime){
  const cacheUrl = new URL(request.url)
  const cacheKey = new Request(cacheUrl.toString(), request)
  let cache = await caches.default
  let response = await cache.match(cacheKey)
  if (!response) {
    console.log('uncached')
    //If not in cache, get it from origin
    response = await fetch(request)

    // Must use Response constructor to inherit all of response's fields
    response = new Response(response.body, response)
    response.headers.delete("Set-Cookie")
    // Cache API respects Cache-Control headers. Setting max-age to 10
    // will limit the response to be in cache for 10 seconds max
    response.headers.set("Cache-Control", "max-age=" + parseInt(cacheTime))
    // Store the fetched response as cacheKey
    // Use waitUntil so computational expensive tasks don"t delay the response
    event.waitUntil(cache.put(cacheKey, response.clone()))
  }
  return response
}

async function getFileList(path,page,event){
  // No cache
  /* const fileListFetch = await fetch('http://pan.baidu.com/api/list?order=time&desc=1&showempty=0&web=1&page='+page+'&num=50&dir='+path+'&channel=chunlei&web=1&app_id=250528&clienttype=0',{
    headers:{
      'Cookie':'BDUSS='+BDUSS+'; STOKEN='+STOKEN+';',
      'User-Agent':USER_AGENT
    }
  }) */
  const fileListRequest = new Request('http://pan.baidu.com/api/list?order=time&desc=1&showempty=0&web=1&page='+page+'&num=50&dir='+path.replace('+','%2B').replace('&','%26')+'&channel=chunlei&web=1&app_id=250528&clienttype=0',{
    headers:{
      'Cookie':'BDUSS='+BDUSS+'; STOKEN='+STOKEN+';',
      'User-Agent':USER_AGENT
    }
  })
  const fileListFetch = await handleCache(fileListRequest,event,3600)
  if(fileListFetch.status == 200){
    const fileJson = await fileListFetch.json()
    if(fileJson['errno'] == 0){
      const fileList = fileJson['list']
      const pathList = path.split('/')
      var folderHtml = ``
      for(i=0;i<pathList.length;i++){
        folderName = pathList[i]
        if(folderName == ''){
          continue
        }else{
          let folderHref = ''
          for(j=0;j<=i;j++){ // stupid loop, need a better way
            folderHref += pathList[j] + '/'
          }
          folderHtml += `<i class="mdui-icon material-icons mdui-icon-dark" style="margin:0;">chevron_right</i>
          <a href="${folderHref}">${decodeURIComponent(pathList[i])}</a>`
        }
      }
      const filesHeader = `<body class="mdui-theme-primary-blue-grey mdui-theme-accent-blue">
      <header class="mdui-appbar mdui-color-theme">
        <div class="mdui-toolbar mdui-container">
          <a href="/" class="mdui-typo-headline">PanList</a>
                <i class="mdui-icon material-icons mdui-icon-dark" style="margin:0;">chevron_right</i>
          <a href="/">/</a>`+ folderHtml +`
        </div>
      </header>
      <div class="mdui-container">
    <div class="mdui-container-fluid">
    <div class="mdui-row">
      <ul class="mdui-list">
        <li class="mdui-list-item th">
          <div class="mdui-col-xs-12 mdui-col-sm-7">文件 </div>
          <div class="mdui-col-sm-3 mdui-text-right">修改时间 </div>
          <div class="mdui-col-sm-2 mdui-text-right">大小 </div>
        </li>`
      if(fileList.length == 0 && page == 1){
        return changeTitle(path,listHeader) + filesHeader + `<li class="mdui-list-item mdui-ripple">
          <a href="${getPreviousPath(path)}">
            <div class="mdui-col-xs-12 mdui-col-sm-7">
            <i class="mdui-icon material-icons">arrow_upward</i>
              ..
            </div>
            <div class="mdui-col-sm-3 mdui-text-right"></div>
            <div class="mdui-col-sm-2 mdui-text-right"></div>
            </a>
        </li>` + listFooter
      }
      else{
        var fileHtml = ``
        if(path != '/' && path != ''){
          fileHtml += `<li class="mdui-list-item mdui-ripple">
          <a href="${getPreviousPath(path)}">
            <div class="mdui-col-xs-12 mdui-col-sm-7">
            <i class="mdui-icon material-icons">arrow_upward</i>
              ..
            </div>
            <div class="mdui-col-sm-3 mdui-text-right"></div>
            <div class="mdui-col-sm-2 mdui-text-right"></div>
            </a>
        </li>`
        }
        for(file of fileList){
          if(file['isdir'] == 1){
            fileHtml += `<li class="mdui-list-item file mdui-ripple">
          <a href="${file['path']}">
            <div class="mdui-col-xs-12 mdui-col-sm-7 mdui-text-truncate">
            <i class="mdui-icon material-icons">folder_open</i>
              ${file['server_filename']}</div>
            <div class="mdui-col-sm-3 mdui-text-right">${new Date(file['server_mtime'] * 1000).toLocaleDateString('zh-CN',{hour12:false})} ${new Date(file['server_mtime'] * 1000).toLocaleTimeString('zh-CN',{hour12:false})}</div>
            <div class="mdui-col-sm-2 mdui-text-right">-</div>
            </a>
            </li>`
          }
          else{
            fileHtml += `<li class="mdui-list-item file mdui-ripple">
            <a href="${file['path']}?download=1" target="_blank">
              <div class="mdui-col-xs-12 mdui-col-sm-7 mdui-text-truncate">
              <i class="mdui-icon material-icons">${getIconText(file['server_filename'])}</i>
              ${file['server_filename']}</div>
              <div class="mdui-col-sm-3 mdui-text-right">${new Date(file['server_mtime'] * 1000).toLocaleDateString('zh-CN',{hour12:false})} ${new Date(file['server_mtime'] * 1000).toLocaleTimeString('zh-CN',{hour12:false})}</div>
              <div class="mdui-col-sm-2 mdui-text-right">${formatBytes(file['size'])}</div>
              </a>
          </li>`
          }
        }
        return changeTitle(path,listHeader)+filesHeader+fileHtml+listFooter
      }
    }
    return 'config error'
  }
  return '网络错误'
}

// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatBytes(a,b=2){if(0===a)return"0 Bytes";const c=0>b?0:b,d=Math.floor(Math.log(a)/Math.log(1024));return parseFloat((a/Math.pow(1024,d)).toFixed(c))+" "+["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"][d]}

function changeTitle(path, listHeader){
  return listHeader.replace('<title>PanList</title>','<title>'+decodeURIComponent(path)+' - PanList</title>')
}

function getIconText(filename){
  var filetype = {
    ondemand_video: ["wmv", "rmvb", "mpeg4", "mpeg2", "flv", "avi", "3gp", "mpga", "qt", "rm", "wmz", "wmd", "wvx", "wmx", "wm", "mpg", "mp4", "mkv", "mpeg", "mov", "asf", "m4v", "m3u8", "swf"],
    audiotrack: ["wma", "wav", "mp3", "aac", "ra", "ram", "mp2", "ogg", "aif", "mpega", "amr", "mid", "midi", "m4a", "flac"],
    image: ["jpg", "jpeg", "gif", "bmp", "png", "jpe", "cur", "svgz", "ico"],
    archive: ["rar", "zip", "7z", "iso"],
    desktop_windows: ["exe"],
    android: ["apk"],
    description: ["txt", "rtf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"],
    picture_as_pdf: ["pdf"],
  }
  var point = filename.lastIndexOf(".");
  var t = filename.substr(point+1);
  if (t == ""){
    return "insert_drive_file";
  }
  t = t.toLowerCase();
  for(var icon in filetype) {
    for(var type in filetype[icon]) {
      if (t == filetype[icon][type])
      {
        return icon;
      }
    }
  }
  return "insert_drive_file";
}

function getPreviousPath(path){
  if(path[path.length - 1] == '/'){
    path = path.substr(0,path.length - 1)
  }
  return path.substr(0, path.lastIndexOf('/')) == '' ? '/' : path.substr(0, path.lastIndexOf('/'))
}

const down = async (host,path,request) => {
  const range = request.headers.get('Range')
  if(range != null){
    return fetch('https://'+host+path, {'method': 'GET', 'headers':{'Range':range,'User-Agent':'netdisk;11.4.5.14'}})
  }
  else{
    return fetch('https://'+host+path, {'method': 'GET', 'headers':{'User-Agent':'netdisk;11.4.5.14'}})
  }
}