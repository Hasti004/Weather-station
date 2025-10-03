import random
import time

def generate_reading():
    # Generate six random integers with ranges similar to your sample "30,65,12,1012,8,6"
    val1 = random.randint(10, 40)      # Example: temperature
    val2 = random.randint(40, 80)      # Example: humidity
    val3 = random.randint(5, 20)       # Example: wind speed
    val4 = random.randint(1000, 1020)  # Example: pressure
    val5 = random.randint(0, 15)       # Example: rainfall
    val6 = random.randint(0, 10)       # Example: UV index

    return f"{val1},{val2},{val3},{val4},{val5},{val6}"

def write_reading(file_path=r"D:\Full Stack Projects\weathersta\backend\data\ahm.txt"):
    while True:
        reading = generate_reading()
        with open(file_path, "w") as file:  # overwrite every 30 sec
            file.write(reading)
        print(f"New reading written: {reading}")
        time.sleep(30)  # wait 30 seconds

if __name__ == "__main__":
    write_reading()
