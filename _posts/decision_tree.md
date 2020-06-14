```python
# This is the pandas module, used to read and manipulate csv file data
import pandas as pd
# Numpy module for numerical computation
import numpy as np
```


```python
# Our dataset, named "golf.csv"
dataset = pd.read_csv("golf.csv")
```


```python
# The first few lines in our dataset.
dataset.head()
```




<div>
<style scoped>
    .dataframe tbody tr th:onlyoftype {
        verticalalign: middle;
    }

    .dataframe tbody tr th {
        verticalalign: top;
    }

    .dataframe thead th {
        textalign: center;
    }
    .dataframe{
        margin: 50px auto;
    }
</style>
<table class="dataframe">
  <thead>
    <tr style="textalign: right;">
      <th></th>
      <th>Outlook</th>
      <th>Temp</th>
      <th>Humidity</th>
      <th>Windy</th>
      <th>Play Golf</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>Rainy</td>
      <td>Hot</td>
      <td>High</td>
      <td>False</td>
      <td>No</td>
    </tr>
    <tr>
      <th>1</th>
      <td>Rainy</td>
      <td>Hot</td>
      <td>High</td>
      <td>True</td>
      <td>No</td>
    </tr>
    <tr>
      <th>2</th>
      <td>Overcast</td>
      <td>Hot</td>
      <td>High</td>
      <td>False</td>
      <td>Yes</td>
    </tr>
    <tr>
      <th>3</th>
      <td>Sunny</td>
      <td>Mild</td>
      <td>High</td>
      <td>False</td>
      <td>Yes</td>
    </tr>
    <tr>
      <th>4</th>
      <td>Sunny</td>
      <td>Cool</td>
      <td>Normal</td>
      <td>False</td>
      <td>Yes</td>
    </tr>
  </tbody>
</table>
</div>




```python
# Let's view more details about our dataset!
dataset.describe()
dataset['Outlook'].unique()
```




    Output: array(['Rainy', 'Overcast', 'Sunny'], dtype=object)




```python
# Let's write a function that takes in data and attribute, and splits it into datasets containing attribute == value
def split_data_by_attribute(dataset, attribute):
    # Let's check if the attribute is in the data.
    try:
        # values_in_attribute represent values in attribute. E.g. "sex" attribute may have values "male", "female", "LGBTQ" or "nopreference"
        values_in_attribute = dataset[attribute].unique()
        split_datasets = []
        for value in values_in_attribute:
            split = dataset[dataset[attribute] == value]
            split_datasets.append((split, value))
            
        # for each split_datasets, we need to remove the attribute that was used to split it
        returnable_datasets = []
        for dataset_s, value in split_datasets:
            returnable_datasets.append((dataset_s.drop(columns=[attribute], axis=1), value))
        return returnable_datasets
    
    except:
        raise print("\n No such attribute\n\n")
```


```python
# An example of execution:
for item in split_data_by_attribute(dataset, 'Outlook'):
    print(item)
    print()
```
    Output:
    (    Temp Humidity  Windy Play Golf
    0    Hot     High  False        No
    1    Hot     High   True        No
    7   Mild     High  False        No
    8   Cool   Normal  False       Yes
    10  Mild   Normal   True       Yes, 'Rainy')
    
    (    Temp Humidity  Windy Play Golf
    2    Hot     High  False       Yes
    6   Cool   Normal   True       Yes
    11  Mild     High   True       Yes
    12   Hot   Normal  False       Yes, 'Overcast')
    
    (    Temp Humidity  Windy Play Golf
    3   Mild     High  False       Yes
    4   Cool   Normal  False       Yes
    5   Cool   Normal   True        No
    9   Mild   Normal  False       Yes
    13  Mild     High   True        No, 'Sunny')
    


##### We can see that the above dataset got split by the "outlook" category
Into three datasets, where values for "outlook" are distinct. The values were "Sunny", "Rainy" and "Overcast".


```python
# This function calculates the entropy of a given dataset. LABEL is a field that is used to calculate the entropy
def calculate_entropy(dataset, label):
    # Occurence of each item in "Label". For our original dataset, "Yes" is repeated 9 times and "No" 5 times.
    occurences = dataset[label].value_counts()
    # Total number of items in dataset. 
    total_count = sum(occurences)
    # Let's convert occurences to probabilities
    occurences /= total_count
    # Entropy is the sumtotal value of probability multiplied by log(base 2) of inverted probability.
    entropy = np.sum(occurences * np.log2(1/occurences))
    return entropy
```


```python
calculate_entropy(dataset, "Play Golf")
```




    Output: 0.9402859586706309



##### Okay! Now our data processing functions are complete!
Let's try to iteratively construct a decision tree that will minimize the entropy, i.e. maximize the information gain at each step along the way!


```python
def build_decision_tree(dataset, case = ""):
    print("")
    print("Building from previous split of", case)
    # Let's establish base cases here.
    # 1. If all labels are same, then return a leaf node. Stop here.
    if len(dataset['Play Golf'].unique()) == 1:
        print("Leaf node reached. Stopping.")
        print("--> RULE REACHED :: ", case, " then ", dataset['Play Golf'].unique())
        print()
        print()
        return
    
    # 2. If all attributes are exhausted, stop.
    if len(dataset.keys()) == 1:
        print("Attributed exhausted. Stopping.")
        return
    
    # Otherwise, continue:
    
    # Get all attributes of dataset!
    attributes = dataset.keys()
    # Let's calculate the entropy of our dataset first
    # TODO: make this "Play Golf" as a standard thing above.
    parent_entropy = calculate_entropy(dataset, "Play Golf")
    information_gains = []
    print(attributes)
    
    # take all attributes into consideration, except for "Play Golf"
    for attribute in attributes[:len(attributes)1]:
        # Split the dataset using the attribute above!
        split_datasets_using_this_attribute = split_data_by_attribute(dataset, attribute)
        # For each split dataset, calculate the entropy!
        entropies = []
        for dataset_s in split_datasets_using_this_attribute:
            entropy = calculate_entropy(dataset_s[0], "Play Golf")
            entropy *= len(dataset_s[0])
            entropy /= len(dataset)
            entropies.append(entropy)
        
        # Sum of entropies:
        sum_of_entropies = sum(entropies)
        # calculate the information gain.
        information_gains.append(parent_entropy  sum_of_entropies)
    
    # Calculate max for information gain
    max_ig = max(information_gains)
    max_ig_id = information_gains.index(max_ig)
    print("Max information gain found using ", attributes[max_ig_id], ":", max_ig)
    print("Splitting from", attributes[max_ig_id], "into different datasets.")
    print("")
    new_nodes_datasets = split_data_by_attribute(dataset, attributes[max_ig_id])
    for dataset_s in new_nodes_datasets:
        # Find what value the attribute had in original dataset.
        build_decision_tree(dataset_s[0], case = case + " and " + attributes[max_ig_id] + "==" + str(dataset_s[1]))
```
<br />
##### Let's Run the program!
<br />
```python
build_decision_tree(dataset, case = "Start")
```

```html
Output: 
Building from previous split of Start
Index(['Outlook', 'Temp', 'Humidity', 'Windy', 'Play Golf'], dtype='object')
Max information gain found using  Outlook : 0.246749819774439
Splitting from Outlook into different datasets.


Building from previous split of Start and Outlook==Rainy
Index(['Temp', 'Humidity', 'Windy', 'Play Golf'], dtype='object')
Max information gain found using  Humidity : 0.9709505944546687
Splitting from Humidity into different datasets.


Building from previous split of Start and Outlook==Rainy and Humidity==High
Leaf node reached. Stopping.
--> RULE REACHED ::  Start and Outlook==Rainy and Humidity==High  then  ['No']



Building from previous split of Start and Outlook==Rainy and Humidity==Normal
Leaf node reached. Stopping.
--> RULE REACHED ::  Start and Outlook==Rainy and Humidity==Normal  then  ['Yes']



Building from previous split of Start and Outlook==Overcast
Leaf node reached. Stopping.
--> RULE REACHED ::  Start and Outlook==Overcast  then  ['Yes']



Building from previous split of Start and Outlook==Sunny
Index(['Temp', 'Humidity', 'Windy', 'Play Golf'], dtype='object')
Max information gain found using  Windy : 0.9709505944546687
Splitting from Windy into different datasets.


Building from previous split of Start and Outlook==Sunny and Windy==False
Leaf node reached. Stopping.
--> RULE REACHED ::  Start and Outlook==Sunny and Windy==False  then  ['Yes']



Building from previous split of Start and Outlook==Sunny and Windy==True
Leaf node reached. Stopping.
--> RULE REACHED ::  Start and Outlook==Sunny and Windy==True  then  ['No']

```