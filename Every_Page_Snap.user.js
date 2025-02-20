// ==UserScript==
// @name        Every Page Snap 💢
// @namespace        http://tampermonkey.net/
// @version        3.0
// @description        「記事の編集・削除」ページで全記事の「公開設定」を記録する
// @author        Ameba Blog User
// @match        https://blog.ameba.jp/ucs/entry/srventrylist*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=ameba.jp
// @run-at        document-start
// @grant        none
// @updateURL        https://github.com/personwritep/Every_Page_Snap/raw/main/Every_Page_Snap.user.js
// @downloadURL        https://github.com/personwritep/Every_Page_Snap/raw/main/Every_Page_Snap.user.js
// ==/UserScript==


let retry=0;
let interval=setInterval(wait_target, 1);
function wait_target(){
    retry++;
    if(retry>100){ // リトライ制限 100回 0.1secまで
        clearInterval(interval); }
    let target=document.documentElement; // 監視 target
    if(target){
        clearInterval(interval);
        style_in(); }}

function style_in(){
    let style=
        '<style id="EPS">'+
        '#globalHeader, #ucsHeader, #ucsMainLeft h1, #ucsMainRight, .l-ucs-sidemenu-area, '+
        '.selection-bar { display: none !important; } '+

        '#ucsContent { width: 930px !important; } '+
        '#ucsContent::before { display: none; } '+
        '#ucsMain { background: none; } '+
        '#ucsMainLeft { width: 930px !important; padding: 0 15px !important; } '+

        '#entryMonth li a:visited { color: #3970B5 !important; }'+
        '#nowMonth { color: #000; } '+
        '#entryListEdit form { display: flex; flex-direction: column; } '+
        '#entrySort { order: -2; margin-bottom: 2px; } '+
        '#sorting { font-size: 15px; margin: 36px 0 4px; padding: 2px 0; height: 114px; } '+
        '#sorting select, #sorting ul { display: none; } '+
        '.pagingArea { order: -1; '+
        'margin-bottom: -33px; position:unset !important; background: #ddedf3; } '+
        '.pagingArea a { border: 1px solid #888; } '+
        '.pagingArea .active{ border: 2px solid #0066cc; } '+
        '.pagingArea a, .pagingArea .active, .pagingArea .disabled { '+
        'font-size: 14px; line-height: 23px; } '+

        '#sorting input { font-family: meiryo; font-size: 15px }'+
        '#div0 { color: #333; margin: 10px -10px 0 15px; }'+
        '#div1 { color: #000; margin: 8px 15px; border: 1px solid #888; background: #fafcfd; }'+
        '#list_snap { padding: 4px 0 2px; margin: 7px 40px 7px 0; width: 210px; }'+
        '#reset { padding: 4px 0 2px; margin-right: 30px; width: 64px; }'+
        '#export { padding: 4px 0 2px; margin: 7px 10px 7px 0; width: 170px; }'+
        '#import_sw { padding: 4px 0 2px; margin: 7px 10px 7px 0; width: 130px; }'+
        '#import_result { display: inline-flex; padding: 2px 0 0; margin: 7px 0; width: 200px; '+
        'overflow: hidden; white-space: nowrap; }'+
        '#import { display: none; }'+
        '#snap_result { display: inline-block; margin: 6px 12px 4px; white-space: nowrap; }'+
        '</style>';

    if(!document.querySelector('#EPS')){
        document.documentElement.insertAdjacentHTML('beforeend', style); }

} // style_in()



window.addEventListener('load', function(){
    let drive_mode;
    let blogDB={}; //「アメンバー公開」の記事IDリスト
    let entry_id;
    let entry_id_DB;
    let publish_f;
    let pub_all;
    let pub_dra;
    let pub_ame;

    let ua=0;
    let agent=window.navigator.userAgent.toLowerCase();
    if(agent.indexOf('firefox') > -1){ ua=1; } // Firefoxの場合のフラグ

    let read_json=localStorage.getItem('blogDB_back'); // ローカルストレージ 保存名
    blogDB=JSON.parse(read_json);
    if(blogDB==null){
        blogDB=[['00000000000', 's']]; }

    drive_mode=blogDB[0][1]; // 起動時に動作フラグを取得
    if(drive_mode==0){ drive_mode='s'; } // 旧ファイルの救済

    reg_set();

    function reg_set(){
        let k;
        entry_id_DB=[]; // リセット
        pub_all=0;
        pub_dra=0;
        pub_ame=0;

        for(k=0; k<blogDB.length; k++){
            entry_id_DB[k]=blogDB[k][0]; // ID検索用の配列を作成
            if(blogDB[k][1]=='0'){
                pub_all +=1; continue; }
            if(blogDB[k][1]=='1'){
                pub_dra +=1; continue; }
            if(blogDB[k][1]=='2'){
                pub_ame +=1; continue; }}}

    control_pannel(drive_mode);



    function control_pannel(d){
        let box=document.querySelector('#sorting');
        if(box){

            let insert_div=
                '<div id="div0">'+
                '<input id="list_snap" type="submit">'+
                '<input id="reset" type="submit" value="初期化">'+
                '<input id="export" type="submit" value="SNAPをファイル保存">'+
                '<input id="import_sw" type="submit" value="ファイル読込み">'+
                '<span id="import_result"></span>'+
                '<input id="import" type="file">'+
                '</div>'+
                '<div id="div1">'+
                '<span id="snap_result"></span>'+
                '</div>';

            if(!box.querySelector('#div0')){
                box.insertAdjacentHTML('beforeend', insert_div); }


            let button1=box.querySelector('#list_snap');
            let button2=box.querySelector('#reset');
            let button3=box.querySelector('#export');
            let button4=box.querySelector('#import_sw');
            let span5=box.querySelector('#import_result');
            let input6=box.querySelector('#import');
            let span7=box.querySelector('#snap_result');


            if(d=='s'){
                button1.value='公開設定のSNAP開始　▶';
                button1.onclick=function(e){
                    e.preventDefault();
                    start(); }

                function start(){
                    let conf_str=['　　 🔴　このページ以降の記事に関して 「公開設定」を記録します',
                                  '\n　　　　  連続動作はコントロール部にマウスに乗せると停止します'].join(' ');
                    let ok=confirm(conf_str);
                    if(ok){
                        blogDB[0][1]='c'; // 連続動作フラグをセット
                        let write_json=JSON.stringify(blogDB);
                        localStorage.setItem('blogDB_back', write_json); // ローカルストレージ 保存
                        next(); }}}


            else if(d=='c'){ // 「c」は連続動作
                button2.style.display='none'; // 動作モードが「c」の場合は非表示
                button3.style.display='none'; // 動作モードが「c」の場合は非表示
                button4.style.display='none'; // 動作モードが「c」の場合は非表示
                span5.style.display='none'; // 動作モードが「c」の場合は非表示


                button1.value='SNAPを停止　　❚❚';
                button1.style.pointerEvents='none';
                button1.style.width='760px';
                box.addEventListener('mouseover', function(e){
                    e.preventDefault();
                    box.style.background='#96b6d2';
                    stop(); }, false);

                function stop(){
                    blogDB[0][1]='s'; // 連続動作フラグをリセット
                    let write_json=JSON.stringify(blogDB);
                    localStorage.setItem('blogDB_back', write_json); } // ローカルストレージ 保存
                setTimeout(next, 400); } // 連続実行のぺージ遷移のタイミング 0.4sec ⭕


            else if(d=='e'){ // 「e」は終了
                button1.value='🔵 SNAPが終了しました';
                button1.style.pointerEvents='none';
                box.style.background='#ddedf3';
                box.addEventListener('mouseover', function(e){
                    e.preventDefault();
                    box.style.background='#ddedf3'; }, false); }


            if(d=='s' || d=='e'){
                button2.onclick=function(e){
                    e.preventDefault();
                    blogDB=[['00000000000', 's']];
                    let write_json=JSON.stringify(blogDB);
                    localStorage.setItem('blogDB_back', write_json); // ローカルストレージ保存
                    snap_disp();
                    button2.value='〔　〕';
                    span5.textContent='';
                    input6.value=''; }

                button3.onclick=function(e){
                    e.preventDefault();
                    let write_json=JSON.stringify(blogDB);
                    let blob=new Blob([write_json], {type: 'application/json'});
                    let a_elem=document.createElement('a');
                    a_elem.href=URL.createObjectURL(blob);
                    a_elem.download='blogDB.json'; // 保存ファイル名
                    if(ua==1){
                        a_elem.target='_blank';
                        document.body.appendChild(a_elem); }
                    a_elem.click();
                    if(ua==1){
                        document.body.removeChild(a_elem); }
                    URL.revokeObjectURL(a_elem.href); }

                button4.onclick=function(e){
                    e.preventDefault();
                    input6.click(); }

                input6.addEventListener("change", function(){
                    if(!(input6.value)) return; // ファイルが選択されない場合
                    let file_list=input6.files;
                    if(!file_list) return; // ファイルリストが選択されない場合
                    let file=file_list[0];
                    if(!file) return; // ファイルが無い場合

                    let file_reader=new FileReader();
                    file_reader.readAsText(file);
                    file_reader.onload=function(){
                        if(file_reader.result.slice(0, 15)=='[["00000000000"'){ // blogDB.jsonの確認
                            let data_in=JSON.parse(file_reader.result);
                            blogDB=data_in; // 読込み上書き処理
                            let write_json=JSON.stringify(blogDB);
                            localStorage.setItem('blogDB_back', write_json); // ローカルストレージ 保存
                            button2.value='初期化'; // 初期化後なら読み込んだ事を示す
                            snap_disp();
                            span5.textContent=file.name; }
                        else{
                            alert("   ⛔ 不適合なファイルです  blogDB(n).json ファイルを選択してください"); }}
                }); }

            snap_disp(); } // if(box)

    } // control_pannel()



    function snap_disp(){
        reg_set();
        let span7=document.querySelector('#snap_result');
        span7.innerHTML='　記録件数：<b>' + (blogDB.length -1) + '</b>　　全員に公開：<b>' + pub_all +
            '</b>　　アメンバー限定公開：<b>' + pub_ame + '</b>　　下書き：<b>' + pub_dra; +'</b>'; }



    function next(){
        let win_url;
        let current;
        let pageid;
        let next_url;
        let pager;
        let end;

        entry_id=document.querySelectorAll('input[name="entry_id"]');
        if(entry_id.length >0){
            snap(); } // 投稿記事がある場合SNAPを実行 無ければスルーする

        win_url=window.location.search.substring(1,window.location.search.length);
        current=win_url.slice(-6);
        if(!current){ current=make_curr(); }

        if(win_url.indexOf('pageID') ==-1){ // pageIDが無い 月のトップページの場合
            pager=document.querySelector('.pagingArea');
            if(pager){ // ページャーが有りその末尾でなければ同月次ページへ
                next_url=['https://blog.ameba.jp/ucs/entry/srventrylist.do?',
                          'pageID=2&entry_ym=' + current].join('');
                window.open( next_url, '_self'); }
            else{ // ページャーが無ければ次月トップページへ
                current=make_next(current);
                if(current!=0){ // 現在を越えないなら次月へ
                    next_url=['https://blog.ameba.jp/ucs/entry/srventrylist.do?',
                              'entry_ym=' + current].join('');
                    window.open( next_url, '_self'); }
                else{ // 現在を越えたら0が戻り停止
                    when_edge(); }}}

        else{ // pageIDを含み 月のトップページでない場合
            end=document.querySelector('.pagingArea .disabled.next');
            if(!end){ // ページャーの末尾でなければ同月次ページへ
                pageid=parseInt(win_url.slice(7).slice(0, -16), 10) +1;
                next_url=['https://blog.ameba.jp/ucs/entry/srventrylist.do?',
                          'pageID=' + pageid + '&entry_ym=' + current].join('');
                window.open( next_url, '_self'); }
            else{ // ページャーの末尾なら次月トップページへ
                current=make_next(current);
                if(current!=0){ // 現在を越えないなら次月へ
                    next_url=['https://blog.ameba.jp/ucs/entry/srventrylist.do?',
                              'entry_ym=' + current].join('');
                    window.open( next_url, '_self'); }
                else{ // 現在を越えたら0が戻り停止
                    when_edge(); }}}


        function make_next(curr){
            let ym;
            let y;
            let m;
            ym=parseInt(curr, 10); // 10進数値化
            y=Math.floor(ym/100); // 年は100で割った商
            m=ym % 100; // 月は100で割った余り
            if(m !=12){
                ym=100*y + m +1; }
            else{
                ym=100*y + 101; }

            let now=new Date();
            if(ym > 100*now.getFullYear() + now.getMonth() +1){
                return 0; } // 現在の月を越える場合は0を返す
            else{
                return ym; }} // 次年月の数値を返す


        function make_curr(){
            let now=new Date();
            return 100*now.getFullYear() + now.getMonth() +1 }


        function when_edge(){
            blogDB[0][1]='s'; // 連続動作フラグをリセット
            let write_json=JSON.stringify(blogDB);
            localStorage.setItem('blogDB_back', write_json); // ローカルストレージ保存
            document.querySelector('#div0').remove();
            document.querySelector('#div1').remove();
            control_pannel('e'); } // SNAP終了時の表示をさせる

    } // next()



    function snap(){ // ページ内の「公開設定」をSNAPする
        let k;
        entry_id=document.querySelectorAll('input[name="entry_id"]');
        publish_f=document.querySelectorAll('input[name="publish_flg"]');

        for(k=0; k< entry_id.length; k++){
            let index=entry_id_DB.indexOf(entry_id[k].value);
            if(index==-1){ // IDがblogDBに記録されていない場合
                blogDB.push([entry_id[k].value, publish_f[k].value]); } // 公開設定の登録を追加
            else{ // IDがblogDBに記録されていた場合
                blogDB[index]=[entry_id[k].value, publish_f[k].value]; }} // 公開設定の登録を更新
        setTimeout(write_local, 10);

        function write_local(){
            let write_json=JSON.stringify(blogDB);
            localStorage.setItem('blogDB_back', write_json); }} // ローカルストレージ保存

});
