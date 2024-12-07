import numpy as np
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

GRID_SIZE = 16
step_counter = 0
sessions = {}

def initialize_empty_grid():
    return np.zeros((GRID_SIZE, GRID_SIZE), dtype=int)

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/initial-grid')
def initial_grid():
    session_id = request.args.get('sessionId')
    print(f"Received sessionId: {session_id}")
    if not session_id:
        return jsonify({'error': 'Session ID is required'}), 400

    if session_id not in sessions:
        print(f"Initializing new grid for session {session_id}")
        sessions[session_id] = initialize_empty_grid().tolist()

    print(f"Returning grid for session {session_id}")
    return jsonify({'grid': sessions[session_id], 'stepCounter': 0})

@app.route('/update', methods=['POST'])
def update():
    global step_counter  # Нужно только для сброса счетчика
    try:
        data = request.get_json()
        print(f"Received data: {data}")

        session_id = data.get('sessionId')
        action = data.get('action')
        print(f"Session ID: {session_id}, Action: {action}")

        if session_id not in sessions:
            print(f"Session not found, initializing: {session_id}")
            sessions[session_id] = initialize_empty_grid().tolist()

        if action == 'toggle':
            i, j = data.get('cell')
            print(f"Toggling cell: ({i}, {j})")
            if 0 <= i < GRID_SIZE and 0 <= j < GRID_SIZE:
                sessions[session_id][i][j] = 1 - sessions[session_id][i][j]
        elif action == 'step':
            print(f"Processing step for session: {session_id}")
            sessions[session_id] = update_grid(np.array(sessions[session_id]), session_id).tolist() # Исправленная строка!
            print(f"Step processed for session: {session_id}")
            step_counter += 1
        elif action == 'reset':
            print(f"Resetting grid for session: {session_id}")
            sessions[session_id] = initialize_empty_grid().tolist()
            step_counter = 0
        else:
            print(f"Invalid action: {action}")
            return jsonify(error="Invalid action"), 400

        print(f"Returning grid: {sessions[session_id]}")
        return jsonify(grid=sessions[session_id], stepCounter=step_counter)
    except Exception as e:
        print(f"Error in update: {e}")
        return jsonify(error=str(e)), 500

def update_grid(grid, session_id):
    new_grid = np.zeros_like(grid)

    for i in range(GRID_SIZE):
        for j in range(GRID_SIZE):
            # Считаем живыми клетками те, у которых значение 1 или 2
            total = sum(1 for x in [grid[i, (j-1)%GRID_SIZE], grid[i, (j+1)%GRID_SIZE],
                                    grid[(i-1)%GRID_SIZE, j], grid[(i+1)%GRID_SIZE, j],
                                    grid[(i-1)%GRID_SIZE, (j-1)%GRID_SIZE], grid[(i-1)%GRID_SIZE, (j+1)%GRID_SIZE],
                                    grid[(i+1)%GRID_SIZE, (j-1)%GRID_SIZE], grid[(i+1)%GRID_SIZE, (j+1)%GRID_SIZE]]
                        if x in [1, 2])

            if grid[i, j] in [1, 2]:  # Живая клетка
                if total < 2 or total > 3:
                    new_grid[i, j] = 3  # Клетка умирает
                else:
                    new_grid[i, j] = 1  # Клетка остается живой
            elif grid[i, j] in [0, 3]:  # Мертвая клетка
                if total == 3:
                    new_grid[i, j] = 2  # Клетка оживает
                else:
                    new_grid[i, j] = 0  # Клетка остается мертвой

    return new_grid

@app.errorhandler(Exception)
def handle_error(e):
    return jsonify(error=str(e)), 500

if __name__ == '__main__':
    app.run(debug=True)
