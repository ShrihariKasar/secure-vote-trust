"""
Verhoeff Checksum Algorithm Implementation.
Used officially by the Unique Identification Authority of India (UIDAI)
for mathematical validation and error detection of 12-digit Aadhaar numbers.
Detects 100% of single-digit transcription errors and adjacent transposition errors.
"""

# The multiplication table (d)
_d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

# The permutation table (p)
_p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

# The inverse table (inv)
_inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

def validate_verhoeff(num_str: str) -> bool:
    """
    Validates a number string using the Verhoeff checksum algorithm.
    Returns True if the check digit matches, False otherwise.
    """
    cleaned = "".join(ch for ch in str(num_str) if ch.isdigit())
    if not cleaned:
        return False
        
    c = 0
    # Process digits in reverse order
    reversed_digits = [int(d) for d in reversed(cleaned)]
    for i, digit in enumerate(reversed_digits):
        c = _d[c][_p[i % 8][digit]]
        
    return c == 0

def compute_verhoeff_checksum(num_str: str) -> int:
    """
    Calculates the 1-digit Verhoeff check digit for an input sequence of digits.
    """
    cleaned = "".join(ch for ch in str(num_str) if ch.isdigit())
    c = 0
    reversed_digits = [int(d) for d in reversed(cleaned)]
    for i, digit in enumerate(reversed_digits):
        c = _d[c][_p[(i + 1) % 8][digit]]
    return _inv[c]

def generate_valid_aadhaar_with_checksum(prefix_11: str) -> str:
    """
    Appends the valid Verhoeff check digit to an 11-digit number to produce
    a mathematically authentic 12-digit Indian Aadhaar number.
    """
    cleaned = "".join(ch for ch in str(prefix_11) if ch.isdigit())[:11]
    cleaned = cleaned.ljust(11, "0")
    check_digit = compute_verhoeff_checksum(cleaned)
    return f"{cleaned}{check_digit}"
