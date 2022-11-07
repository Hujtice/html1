import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error
from statsmodels.tsa.ar_model import AR

import matplotlib.pyplot as plt
from matplotlib import rcParams
from cycler import cycler

rcParams['figure.figsize'] = 18, 5
rcParams['axes.spines.top'] = False
rcParams['axes.spines.right'] = False
rcParams['axes.prop_cycle'] = cycler(color=['#365977'])
rcParams['lines.linewidth'] = 2.5

# Create
np.random.seed(2)
xs = np.arange(0, 500, 5)
ys = [x + np.random.random() * 10 for x in xs]

df = pd.DataFrame(data={
    'x': xs,
    'y': ys
})

# Plot
plt.title('Random dataset', size=20)
plt.plot(df['y'])

