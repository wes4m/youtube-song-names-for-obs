from flask import Flask, request, render_template, jsonify
app = Flask(__name__)

widget = None

def update_to_hide():
    global widget
    widget = {"title": '', "thumbnail": '', "isplaying": False}

def update_to_show(name, url):
    global widget

    ytv_id = url.split("v=")[1]
    if "&" in ytv_id:
        ytv_id = ytv_id.split("&")[0]

    thumbnail = f"https://img.youtube.com/vi/{ytv_id}/mqdefault.jpg"
    widget = {"title": name, "thumbnail": thumbnail, "isplaying": True}

@app.route('/', methods=['GET'])
def get_widget():
	return render_template('widget.html')

@app.route('/live_widget_status', methods=['GET'])
def live_widget_status():
    global widget
    return jsonify(widget)

@app.route('/update_widget', methods=['POST'])
def update_widget():
    data = request.get_json()

    if data['audible']:
        if 'youtube' in data['url']:
            video = update_to_show(data['title'], data['url'])
        else:
            # Audible but Not youtube, hide widget ..
            update_to_hide()
    else:
         # Not audible (paused, closed, nothing playing .. etc), hide widget ..	
         update_to_hide()

    return "UPDATED"

if __name__ == '__main__':
    update_to_hide()
    app.run(host="localhost", port=6767)
