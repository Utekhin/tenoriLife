import numpy as np
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

GRID_SIZE = 16
step_counter = 0

def initialize_empty_grid():
    return np.zeros((GRID_SIZE, GRID_SIZE), dtype=int)

grid = initialize_empty_grid()

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
    global grid, step_counter
    return jsonify(grid=grid.tolist(), stepCounter=step_counter)

@app.route('/update', methods=['POST'])
def update():
    global grid, step_counter
    try:
        data = request.get_json()
        action = data.get('action')

        if action == 'toggle':
            i, j = data.get('cell')
            if 0 <= i < GRID_SIZE and 0 <= j < GRID_SIZE:
                grid[i][j] = 1 - grid[i][j]
        elif action == 'step':
            grid = update_grid(grid)
            step_counter += 1
        elif action == 'reset':
            grid = initialize_empty_grid()
            step_counter = 0
        else:
            return jsonify(error="Invalid action"), 400
        
        return jsonify(grid=grid.tolist(), stepCounter=step_counter)
    except Exception as e:
        return jsonify(error=str(e)), 500

def update_grid(grid):
    new_grid = np.zeros_like(grid)
    
    for i in range(GRID_SIZE):
        for j in range(GRID_SIZE):
            total = int((grid[i, (j-1)%GRID_SIZE] + grid[i, (j+1)%GRID_SIZE] +
                         grid[(i-1)%GRID_SIZE, j] + grid[(i+1)%GRID_SIZE, j] +
                         grid[(i-1)%GRID_SIZE, (j-1)%GRID_SIZE] + grid[(i-1)%GRID_SIZE, (j+1)%GRID_SIZE] +
                         grid[(i+1)%GRID_SIZE, (j-1)%GRID_SIZE] + grid[(i+1)%GRID_SIZE, (j+1)%GRID_SIZE]))

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