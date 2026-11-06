# 演奏教材JSONの作り方

UTF-8のJSONを「自分のJSONを開く」で選ぶ。端末内で読み、アップロードしない。コメントや末尾カンマ不可。schemaVersion1/id/revision/title/countInBeats/eventsが必須。soundは省略可。無料の完全例はsamples/。採点・自己ベストはない。

## 拍とイベント

1 beatは通常拍線・クリック1個分。音符名固定ではない。BPM80なら毎分80クリック。曲頭0から絶対beatを使い、0.5等の途中も可能。整数拍だけクリックするため、全ノートでクリックが鳴るとは限らない。

| e | 項目 | 意味 |
|---|---|---|
| tempo | beat,bpm | その拍から一定BPM。beat0に1つ必須 |
| tempoRamp | beat,toBeat,toBpm | 拍に対して直線に加減速、初期BPMは継承 |
| note | beat,key | 小文字a〜zの入力のお手本。入力で消えない |
| hint | beat,text | 次まで維持、空文字で消す |
| barline | beat,style | 任意区切り。0太い実線、1破線 |

tempoRampの重複や途中tempoは不可、終点から次の制御は可。barlineは音やテンポを変えず、拍子分子分母・meterは不要。6拍なら0〜5に拍線、6に次の大区切り、途中3にstyle1など。次が5拍でもよい。

countInBeatsは曲頭より前の予備拍数（非負整数）。6拍区切り2小節なら12。1拍アウフタクトは最初note0、次のbarline1として指定可能。hintは読む時間を確保してノートより早く出せる。

## 音セットと26キー

トップレベルsoundの例：

    "sound": {
      "preset": "chip",
      "default": "miss",
      "keys": { "f": 60, "j": 67 }
    }

chipは全キー共通の短い矩形波音色で、値はMIDI番号36〜96の整数（69=440Hz）またはmiss。MIDI通信は不要。上の例はF/Jだけ通常音、残り24キーはハズレ音。Fを違う拍で押しても通常音で、正誤判定はしない。使用noteキーがmissなら警告する。

drumsは短い発振器で作る近似打楽器セット。値は下記IDまたはmiss。

- kick-1〜kick-6：低い太鼓風
- tom-1〜tom-5：タム風
- wood-1〜wood-5：木を打つ音風
- snare-1〜snare-5：スネア風
- hat-1〜hat-5：ハット風

同じ種類でも数字が大きいと高い音。スネア・ハットも発振器による近似で、実際の楽器録音ではない。例：presetをdrums、keysを{"f":"kick-1","j":"snare-1","k":"hat-1"}にする。1曲につき1セット、キーの音は曲中一定。全GMドラム・独自音色読込は非対応。

sound省略時はchip、キーボード順QWERTYUIOP/ASDFGHJKL/ZXCVBNMへ48〜73の26音。drumsはこの順へkick-1,tom-1,wood-1,snare-1,hat-1,kick-2…kick-6の26音。default省略時はセット標準を使う。keysがdefaultより優先。遊ぶ人の変更が最優先で、教材切替時に新教材へ戻る。未知のセット・打楽器IDは警告して既定へ戻し、不正型・範囲外音高は読込エラー。

古いschemaVersion1教材は音指定なしで利用できる。古いアプリはsoundを無視するため、音指定付き教材はv1.2以降で確認する。内容更新時はrevisionを変更する。

## キー・検証・公開

3段10列の簡易キーボードと10指レーン：QAZ/WSX/EDC/RFV/TGB/YHN/UJM/IK/OL/P。人差し指はF/J基本位置から内側にも伸ばす。数字・記号・親指・同時ノートは対象外。キーを離して再度押す。入力時刻・正誤で発音を制限しない。

5MB、100000イベント、hint2000文字、BPM20〜400、有限の非負beat。note1個以上、同拍1個。未知イベントは警告して無視、未知schemaはエラー。不正データで現在の教材を上書きしない。HTMLやURLは実行しない。無料・公開可能な教材だけ配布し、有料データは公開リポジトリへ入れない。
