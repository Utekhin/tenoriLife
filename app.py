from flask import Flask, render_template, jsonify, request
import numpy as np

app = Flask(__name__)

GRID_SIZE = 16
grid = np.zeros((GRID_SIZE, GRID_SIZE), dtype=int)
step_counter = 0

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
        grid = np.zeros((GRID_SIZE, GRID_SIZE), dtype=int)
        step_counter = 0

    return jsonify(grid=grid.tolist(), stepCounter=step_counter)

def update_grid(grid):
    new_grid = np.copy(grid)
    for i in range(GRID_SIZE):
        for j in range(GRID_SIZE):
            total = int((grid[i, (j-1)%GRID_SIZE] + grid[i, (j+1)%GRID_SIZE] +
                         grid[(i-1)%GRID_SIZE, j] + grid[(i+1)%GRID_SIZE, j] +
                         grid[(i-1)%GRID_SIZE, (j-1)%GRID_SIZE] + grid[(i-1)%GRID_SIZE, (j+1)%GRID_SIZE] +
                         grid[(i+1)%GRID_SIZE, (j-1)%GRID_SIZE] + grid[(i+1)%GRID_SIZE, (j+1)%GRID_SIZE]))
            if grid[i, j] == 1 and (total < 2 or total > 3):
                new_grid[i, j] = 0
            elif grid[i, j] == 0 and total == 3:
                new_grid[i, j] = 1
    return new_grid

if __name__ == '__main__':
    app.run(debug=True)