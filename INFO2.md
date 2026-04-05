< Go to the original

Preview image
🚀 Automating UX/UI Design Analysis with Python, Machine Learning, and LLMs
Introduction
Jade Graham
Jade Graham

Follow
androidstudio
·
September 12, 2024 (Updated: November 16, 2024)
·
Free: No
Introduction
In today's fast-paced design landscape, creating intuitive and user-friendly products is more critical than ever. User Experience (UX) and User Interface (UI) designers are often tasked with the challenging role of balancing aesthetics with functionality, ensuring that their designs are both visually appealing and easy to use. However, this process can be time-consuming and subjective, often relying on manual reviews, which can vary widely depending on who performs them.

This blog will walk you through how to build an automated design analysis tool using Python, machine learning, and large language models (LLMs). By doing so, we can streamline the UX/UI design process, offering instant, consistent, and objective critiques based on key design elements such as colors, structure, shapes, and more.

💡 How I Got the Idea to Build This Tool
This morning, I was reflecting on the complexities of UX/UI design, particularly how important it is to get things right from a product standard perspective. In a world where digital products are judged within seconds, ensuring a seamless user experience is crucial. However, the process of critiquing designs and understanding how various elements like color schemes, layouts, and usability impact user behavior is both time-consuming and subjective.

I began to think: Is there a way to speed up this process by automating the analysis of design elements? What if we could analyze images, extract valuable metrics, and use that data to better inform design decisions? With the wealth of AI tools at our disposal today, particularly in the field of image processing and natural language generation, it seemed plausible to build something that could automatically critique designs.

By utilizing these metrics — such as dominant colors, structure, and shape layouts — we can generate a comprehensive analysis that not only offers objective feedback but also helps us understand user behaviors and criteria more deeply. I envisioned a tool that could assist designers in making informed decisions about their designs, ensuring that they align with user expectations, improve usability, and enhance overall user experience.

This concept of real-time design analysis could revolutionize the way we approach UX/UI development, by providing valuable insights into what works, what doesn't, and how users might react to certain design choices. Ultimately, this would allow for faster iterations, better designs, and a more data-driven approach to creativity.

Why Automated Design Analysis Tools Are Important in the Industry
The Growing Need for Speed and Consistency ⚡
In an industry where time-to-market is critical, design teams are increasingly pressured to deliver high-quality designs at faster rates. Traditional methods of design evaluation are often manual and slow, creating bottlenecks in the product development cycle. Moreover, manual critiques can vary greatly from one person to another, introducing subjectivity that may lead to inconsistencies across projects.

This is where automated design analysis tools become invaluable. By leveraging machine learning and AI models like Qwen-2, we can automatically analyze designs, generate critiques, and even suggest improvements — all in real-time. These tools not only save time but also offer consistent, data-driven feedback that can greatly improve the quality and usability of a product.

The Value of Objective Critiques 📝
A major pain point in design critique is subjectivity. While human intuition is essential, automated tools help standardize feedback by focusing on measurable factors like color contrast, layout complexity, and accessibility. By automating the evaluation process, you can ensure that every design is reviewed with the same rigorous standards, regardless of who is on the project.

Implementation Process
🖼️ Step 1: Loading and Displaying the Image
The first step in our tool is to load and display the image that we want to analyze. We'll use OpenCV for image handling and Matplotlib for visualization.

Copy
def load_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Image not found at path: {image_path}")
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    plt.imshow(image_rgb)
    plt.axis('off')
    plt.show()
    return image_rgb
Technical Breakdown 🛠️
OpenCV: The cv2.imread() function loads an image in BGR format. This format is OpenCV's default, but since most libraries (including Matplotlib) expect the RGB format, we convert the image using cv2.cvtColor().
Matplotlib: The imshow() function from Matplotlib allows us to display the image, while plt.axis('off') hides the axes for a cleaner look.
🎨 Step 2: Extracting Dominant Colors Using K-means Clustering
Color plays a massive role in user experience and brand identity. We can use K-means clustering to extract the most dominant colors from the design, giving us insight into the color scheme.

Copy
def extract_colors(image, n_colors=5):
    pixels = image.reshape(-1, 3)  # Reshaping the image to a 2D array of pixels
    kmeans = KMeans(n_clusters=n_colors)  # Clustering colors
    kmeans.fit(pixels)
    colors = kmeans.cluster_centers_.astype(int)  # Getting dominant color centers
    labels, counts = np.unique(kmeans.labels_, return_counts=True)  # Count occurrences of each color
    return colors, counts
Technical Breakdown 🛠️
Reshaping the Image: Before applying K-means clustering, we need to reshape the image into a two-dimensional array, where each row represents a pixel and each column represents its RGB value.
K-means Clustering: This unsupervised machine learning algorithm clusters the image pixels into n_colors groups. The centroids of these clusters represent the dominant colors.
Color Frequency: By calculating the frequency of each color, we can gauge which colors dominate the design, which could impact both the usability and emotional appeal of the interface.
🔍 Step 3: Performing Edge Detection
Edge detection helps us understand the structural complexity of the design. More edges generally mean a more intricate design, while fewer edges indicate simplicity.

Copy
def edge_detection(image):
    gray_image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray_image, threshold1=100, threshold2=200)
    plt.imshow(edges, cmap='gray')
    plt.axis('off')
    plt.show()

edge_count = np.sum(edges > 0)
    if edge_count > 50000:
        structure_desc = "The design contains a significant amount of sharp edges, indicating a complex structure."
    elif edge_count > 20000:
        structure_desc = "The design contains a moderate amount of edges, suggesting a balanced structure."
    else:
        structure_desc = "The design contains few edges, indicating a simple and clean layout."
    
    return structure_desc
Technical Breakdown 🛠️
Canny Edge Detection: This is a popular algorithm for detecting edges in an image by identifying points where the brightness changes sharply.
Edge Count: By counting the number of edges in the image, we can quantify the design's complexity. A higher number of edges usually correlates with a more detailed and complex layout, which can either help or hinder usability depending on the context.
🔲 Step 4: Shape Detection via Contours
To further understand the layout, we perform contour detection, which allows us to outline shapes in the design.

Copy
def shape_detection(image):
    gray_image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray_image, 127, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contour_image = image.copy()
    cv2.drawContours(contour_image, contours, -1, (0, 255, 0), 3)
    plt.imshow(contour_image)
    plt.axis('off')
    plt.show()
Technical Breakdown 🛠️
Thresholding: We apply binary thresholding to the image, where pixels above a certain brightness are turned white, and others are black. This helps isolate shapes.
Contour Detection: Contours are the boundaries of objects in an image. By finding these contours, we can detect and highlight key shapes in the design, which can inform decisions on balance, whitespace, and user flow.
🧪 Step 5: Classifying Designs Based on Extracted Colors
Now that we have extracted color features, we can use them to classify the design as either "good" or "bad" based on predetermined criteria.

Copy
def classify_images(colors):
    X = np.array([colors for _ in range(10)])  # Simulating dataset
    y = np.array([0, 1, 0, 1, 1, 0, 1, 0, 1, 0])  # Labels: 0 = bad design, 1 = good design
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    classifier = SVC()
    classifier.fit(X_train.reshape(len(X_train), -1), y_train)
    
    y_pred = classifier.predict(X_test.reshape(len(X_test), -1))
    accuracy = np.mean(y_pred == y_test)
    print(f"Classification Accuracy: {accuracy}")
Technical Breakdown 🛠️
Support Vector Classifier (SVC): We use an SVC to classify the design based on color features. While color alone is not sufficient for a full design critique, this step demonstrates how machine learning can be applied to assess certain design characteristics.
Training and Testing: The dataset is split into training and testing sets to evaluate the model's accuracy. This classification could be extended to include additional features such as typography or layout complexity.
💡 Step 6: Generating a Design Critique with Qwen-2
The extracted design features (color palette, structure description) are then used to generate a comprehensive critique through the Qwen-2 large language model.

Copy
def generate_design_critique(color_palette, structure):
    description = f"""
    Design Analysis:
    - Color Palette: {', '.join(color_palette)}
    - Structure: {structure}
    
    Please provide a critique of this design considering aspects like color harmony, usability, accessibility, and balance.
    """
    return description
Why Use an LLM for Critique? 🤖
Large language models like Qwen-2 are powerful tools for generating natural language responses based on input data. By passing in structured information such as color harmony and structure, the LLM can provide detailed, context-aware critiques, which would typically require a human expert.

Copy
def get_qwen2_critique(prompt):
    tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2-7B-Instruct")
    model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2-7B-Instruct", torch_dtype="auto", device_map="auto")
    
    messages = [{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": prompt}]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)
    
    generated_ids = model.generate(**model_inputs, max_new_tokens=512)
    response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return response
Technical Breakdown 🛠️
Tokenization: The input prompt is tokenized into a format that the model can understand.
Generation: The model generates a detailed critique based on the provided design elements, using natural language to offer insights on color harmony, usability, balance, and more.
🛠️ Step 7: Running the Complete Program
Finally, we can integrate all the functions into a single program that analyzes a design and generates a critique:

Copy
def main(image_path):
    try:
        # Load the image
        image_rgb = load_image(image_path)

        # Extract color palette description
                color_palette = extract_colors_description(image_rgb)
                # Perform edge detection and get structure description
                structure_description = edge_detection(image_rgb)
                # Perform shape detection
                shape_detection(image_rgb)
                # Classify images based on extracted color features
                classify_images(np.array([list(map(int, color[4:-1].split(','))) for color in color_palette]))
                # Generate the design critique description for Qwen-2
                critique_input = generate_design_critique(color_palette, structure_description)
                # Pass the critique to Qwen-2
                qwen2_response = get_qwen2_critique(critique_input)
                print("Qwen-2 Response:")
                print(qwen2_response)
            except FileNotFoundError as e:
                print(e)
        # Example image path
        image_path = '/content/Floristry Proof.png'
        main(image_path)
🤔 Why Is This Tool Useful in the Industry?
1. Faster Feedback Loops 🚀
Automating design critiques dramatically reduces the time spent on reviews. Designers can receive instant feedback on color harmony, structure, and usability, allowing them to iterate faster and more efficiently.

2. Consistency Across Teams 📊
Subjective critiques can vary from one person to another. This tool offers consistent, data-driven feedback across projects and teams, ensuring uniform quality standards.

3. Scalability 🌍
For larger organizations handling multiple projects, scaling manual critiques can be a challenge. An automated tool like this can easily handle multiple designs simultaneously, ensuring each receives the same level of scrutiny.

4. Usability and Accessibility Insights 💻
With the ability to analyze structure and color palettes, this tool helps ensure that designs are not only aesthetically pleasing but also accessible and easy to use.

Full Code 🧑‍💻
Copy
# Import necessary libraries
import cv2
import numpy as np
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from transformers import AutoModelForCausalLM, AutoTokenizer

# Function to load and display an image
def load_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Image not found at path: {image_path}")
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    plt.imshow(image_rgb)
    plt.axis('off')
    plt.show()
    return image_rgb

# Function to extract dominant colors using K-means clustering
def extract_colors(image, n_colors=5):
    pixels = image.reshape(-1, 3)
    kmeans = KMeans(n_clusters=n_colors)
    kmeans.fit(pixels)
    colors = kmeans.cluster_centers_.astype(int)
    labels, counts = np.unique(kmeans.labels_, return_counts=True)
    return colors, counts

# Function to generate descriptive text for the colors
def extract_colors_description(image, n_colors=5):
    colors, counts = extract_colors(image, n_colors)
    color_descriptions = [f"RGB({color[0]}, {color[1]}, {color[2]})" for color in colors]
    return color_descriptions

# Function to perform edge detection and return structural description
def edge_detection(image):
    gray_image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray_image, threshold1=100, threshold2=200)
    plt.imshow(edges, cmap='gray')
    plt.axis('off')
    plt.show()

    # Count number of edges and generate a meaningful structure description
    edge_count = np.sum(edges > 0)
    if edge_count > 50000:
        structure_desc = "The design contains a significant amount of sharp edges, indicating a complex structure."
    elif edge_count > 20000:
        structure_desc = "The design contains a moderate amount of edges, suggesting a balanced structure."
    else:
        structure_desc = "The design contains few edges, indicating a simple and clean layout."
    
    return structure_desc

# Function to perform shape detection (contour detection)
def shape_detection(image):
    gray_image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray_image, 127, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contour_image = image.copy()
    cv2.drawContours(contour_image, contours, -1, (0, 255, 0), 3)
    plt.imshow(contour_image)
    plt.axis('off')
    plt.show()

# Function to classify images based on extracted colors
def classify_images(colors):
    # Simulating feature vectors for multiple images (using color data)
    X = np.array([colors for _ in range(10)])  # Example dataset
    y = np.array([0, 1, 0, 1, 1, 0, 1, 0, 1, 0])  # Labels (0 for bad design, 1 for good design)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    classifier = SVC()
    classifier.fit(X_train.reshape(len(X_train), -1), y_train)
    
    y_pred = classifier.predict(X_test.reshape(len(X_test), -1))
    accuracy = np.mean(y_pred == y_test)
    print(f"Classification Accuracy: {accuracy}")

# Function to generate a critique based on extracted features
def generate_design_critique(color_palette, structure):
    # Combine features into a descriptive prompt for Qwen-2
    description = f"""
    Design Analysis:
    - Color Palette: {', '.join(color_palette)}
    - Structure: {structure}
    
    Please provide a critique of this design considering aspects like color harmony, usability, accessibility, and balance.
    """
    return description

# Function to pass critique to Qwen-2
def get_qwen2_critique(prompt):
    # Load pre-trained Qwen-2 model and tokenizer from Hugging Face
    tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2-7B-Instruct")
    model = AutoModelForCausalLM.from_pretrained(
        "Qwen/Qwen2-7B-Instruct",
        torch_dtype="auto",
        device_map="auto",
    )

    # Encode the prompt and generate response
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": prompt},
    ]
    
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

    # Generate response
    generated_ids = model.generate(
        **model_inputs,
        max_new_tokens=512,
    )

    generated_ids = [
        output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
    ]

    response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return response

# Main execution
def main(image_path):
    try:
        # Load the image
        image_rgb = load_image(image_path)

        # Extract color palette description
        color_palette = extract_colors_description(image_rgb)

        # Perform edge detection and get structure description
        structure_description = edge_detection(image_rgb)

        # Perform shape detection
        shape_detection(image_rgb)

        # Classify images based on extracted color features
        classify_images(np.array([list(map(int, color[4:-1].split(','))) for color in color_palette]))

        # Generate the design critique description for Qwen-2
        critique_input = generate_design_critique(color_palette, structure_description)

        # Pass the critique to Qwen-2
        qwen2_response = get_qwen2_critique(critique_input)
        print("Qwen-2 Response:")
        print(qwen2_response)

    except FileNotFoundError as e:
        print(e)

# Example image path
image_path = '/content/Floristry Proof.png'
main(image_path)
🚀 How to Test the Automated UX/UI Design Tool
The best way to test this tool is to run it in Google Colab, which provides a powerful cloud environment with access to GPUs for faster processing. Below, I'll guide you through how to set it up, change the runtime settings, and upload your own design image for analysis.

Step-by-Step Guide to Running the Tool in Google Colab
Open Google Colab:
Head over to Google Colab, which provides a cloud-based Jupyter notebook environment that can run Python code.

2. Set Runtime to Use GPU:

Once in your Colab notebook, click on Runtime > Change runtime type.
In the dialog that appears, set the Hardware accelerator to GPU and click Save. Using the GPU will speed up tasks like image processing and model inference.
3. Copy and Paste the Full Code:

Copy the full Python code provided in the code section and paste it into a code cell in your Colab notebook.
4. Upload Your Design Image:

In the sidebar, click on the Files tab and then Upload. Select your design image from your local machine.
After uploading, take note of the file path in the sidebar (usually something like /content/your_image.png).
Alternatively, you can use:

Copy
from google.colab import files
uploaded = files.upload()
This command will allow you to upload an image from your local machine directly into the Colab environment.

5. Replace the Image Path:

In the script, replace the existing file path (image_path = '/content/Floristry Proof.png') with the file path of your uploaded image:
Copy
image_path = '/content/your_image.png'  # Replace with your image file path
6. Run the Script:

After making these changes, run the entire script. The tool will:
Load and display your design.
Extract the dominant colors using K-means clustering.
Perform edge and shape detection to understand the structure.
Classify the design based on extracted color features.
Generate a critique using the Qwen-2 large language model.
7. View the Output

The tool will display the extracted features (colors, structure, shapes) and provide a detailed critique generated by the LLM. You'll see visual outputs for color extraction, edge detection, and shape detection, as well as the classification result and the LLM-generated critique.

By following these steps, you can easily test this tool on your own designs. Using Google Colab with a GPU provides the computational power needed for efficient image processing and model inference, making it the ideal platform for testing this design analysis tool.

📊 Results from Running the Automated UX/UI Design Tool
After running the tool in Google Colab, the following key results were achieved:

Color Extraction: The tool identified five dominant colors, primarily shades of grey with some contrasting colors. The critique suggested that while the contrast is effective, a more harmonious color scheme could enhance the design.
Classification Accuracy: The model's classification accuracy was 0.0, likely due to the small, simulated dataset used. This demonstrates the need for a more extensive dataset for better classification performance.
Qwen-2 Design Critique: The large language model generated detailed feedback, highlighting areas for improvement in:
Color harmony: Suggested using complementary or analogous colors.
Usability: Recommended simplifying complex sharp edges and ensuring clear element positioning.
Accessibility: Raised concerns about low contrast, which may affect readability.
Balance: Advised balancing sharp and smooth elements for a cohesive design.
These insights offer valuable, data-driven suggestions for refining the design to improve both usability and user experience.

None
Example image used, a colourful floritsry design incorporating a pastel palette in a website design
Qwen-2 Response Critique
Color Harmony: The color palette provided appears to be somewhat monochromatic, with shades of light grey (RGB(254, 253, 253) and dark grey (RGB(54, 54, 40). The inclusion of three other colors (RGB(151, 147, 118), RGB(180, 93, 58), and RGB(237, 203, 174) breaks the monotony but might lead to a slightly dissonant effect if not used correctly.

The colors seem to be chosen for their contrast, which can be good for visual impact but may also create strain on the eyes, especially in long usage scenarios. For a harmonious design, it would be beneficial to consider analogous or complementary color schemes that would blend well together.

Usability: The use of sharp edges suggests a potentially complex user interface. While complexity can sometimes enhance functionality by providing more options, it can also lead to confusion or difficulty in navigation, particularly for users who are not accustomed to such designs. It's crucial to ensure that each element is intuitive and logically positioned.

Incorporating clear labels, consistent spacing, and a logical hierarchy could improve the usability of the design.

Accessibility: Considering the color combinations, there is a potential issue with color contrast. For instance, the contrast between the light grey background and the text color (RGB(54, 54, 40) might not meet the WCAG (2.0 guidelines for sufficient contrast, making it difficult for people with low vision to read the text. It's important to ensure that the text is readable against the background and that the contrast ratio meets accessibility standards.

Balance: The presence of sharp edges contributes to a sense of dynamic movement and tension within the design. However, balance in design refers to both the visual equilibrium and the psychological equilibrium of the viewer. If the sharp edges dominate, they might create an unbalanced look that could be unsettling or distracting. A balance between sharpness and smooth elements could help achieve a more cohesive aesthetic.

In summary, while the design shows potential through its use of color contrasts and sharp edges, it needs refinement in terms of color harmony, ensuring better usability, enhancing accessibility, and achieving a balanced aesthetic. The designer should consider the principles of color theory, user experience design, and accessibility guidelines to make the design more effective and appealing to a wide range of users.

None
None
Conclusion 🎉
Building an automated UX/UI design analysis tool is an exciting step toward improving design workflows. By combining computer vision techniques, machine learning models, and large language models, you can create a robust system that provides objective, data-driven critiques in real-time. This approach can save time, improve consistency, and help designers make more informed decisions. As AI tools like Qwen-2 evolve, the potential to offer even more sophisticated design analysis will continue to grow.

With this tutorial, you're now equipped to build your own design analysis tool, tailored to meet the needs of modern design teams. Happy coding!