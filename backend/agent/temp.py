import boto3
from langchain_aws import ChatBedrock

import json
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain.chains import LLMChain


import os
os.environ['TAVILY_API_KEY'] = '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'

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.prompts import ChatPromptTemplate

bedrock_runtime = boto3.client(
    service_name="bedrock-runtime",
    region_name="us-west-2",
)

model_id = "anthropic.claude-3-5-sonnet-20241022-v2:0"

model_kwargs =  { 
    "max_tokens": 512,
    "temperature": 0.0,
}

# Model created
claude_3_client = ChatBedrock(
    client=bedrock_runtime,
    model_id=model_id,
    model_kwargs=model_kwargs,
)

# Create memory
memory = ConversationBufferMemory(
    memory_key="chat_history",
    input_key="human_input",  # This matches the example pattern
    return_messages=True
)

# Prompt created
prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system", 
            "You are a helpful assistant. Think step-by-step before providing a final answer. Use the tavily_search_results_json tool whenever necessary."
        ),
        (
            "placeholder", 
            "{chat_history}"
        ),
        ("human", "{human_input}"),  # Changed to match input_key in memory
        ("placeholder", "{agent_scratchpad}"),
    ]
)


# Tools aggregated
tools = [TavilySearchResults(max_results=1)]

# Construct the Tools agent
agent = create_tool_calling_agent(
        claude_3_client, 
        tools, 
        prompt
        )

# Create an agent executor by passing in the agent and tools with memory
agent_executor = AgentExecutor(
    agent=agent, 
    tools=tools, 
    verbose=True,
    memory=memory,  # Connect memory directly to the executor
    max_iterations=3
    )

# Example of using the agent with memory
def chat_with_memory(query):
    # Memory is now automatically handled by the executor
    response = agent_executor.invoke({"human_input": query})
    return response["output"]

# Run a simple example
output1 = chat_with_memory("What is an elephant ?")
print("First response:", output1)

# Run a follow-up question that should use memory context
output2 = chat_with_memory("What did I just ask you about?")
print("Second response:", output2)
