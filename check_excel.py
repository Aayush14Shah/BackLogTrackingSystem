import pandas as pd

df = pd.read_excel('BATCH 2021 SEM-6 FAILURE COMPONENTWISE.xlsx', header=None)
row2 = df.iloc[2].tolist()

print('Total items in row 2:', len(row2))
print('\nItems after index 0:')
for i, item in enumerate(row2[1:]):
    if pd.notna(item):
        print(f'  Index {i+1}: [{item}]')
